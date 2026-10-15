/**
 * Encrypted .env at rest — same scheme and file format as new_adib_backend (src/encrypt-util.ts,
 * src/main.ts), so deployment uses one procedure and one passcode style for every service:
 *
 *   .env       plain file copied in by deployment; encrypted to .env.enc on start, then deleted
 *   .env.enc   AES-256-CBC, key = scrypt(passcode, 'salt', 32), stored as "<iv hex>:<cipher hex>"
 *   .passcode  "<salt>:<pbkdf2-sha512(passcode, salt, 1000, 64) hex>" — verifies the passcode
 *
 * Start-up:
 *   - .env and no .passcode  → set an initial passcode, encrypt, delete .env
 *   - .env and .passcode     → new settings copied in: verify passcode, re-encrypt, delete .env
 *   - .env.enc only          → enter passcode, decrypt into process.env (optionally change it)
 *   - none of them           → nothing to unlock; settings come from the server environment
 *
 * The passcode is typed at the prompt, or given in ENV_PASSCODE for non-interactive starts.
 * Values already in the environment (server / docker-compose) win over the file's.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string, passcode: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(passcode, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

export function decrypt(encrypted: string, passcode: string): string {
  const [iv, content] = encrypted.split(':');
  const key = crypto.scryptSync(passcode, 'salt', 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  return decipher.update(content, 'hex', 'utf8') + decipher.final('utf8');
}

export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.pbkdf2Sync(passcode, salt, 1000, 64, 'sha512').toString('hex')}`;
}

export function comparePasscode(passcode: string, storedHash: string): boolean {
  const [salt, key] = storedHash.trim().split(':');
  return key === crypto.pbkdf2Sync(passcode, salt, 1000, 64, 'sha512').toString('hex');
}

function apply(contents: string): void {
  const parsed = dotenv.parse(Buffer.from(contents));
  for (const key of Object.keys(parsed)) {
    if (process.env[key] === undefined) process.env[key] = parsed[key];
  }
}

export async function unlockEnv(root: string = process.cwd()): Promise<void> {
  const envPath = path.join(root, '.env');
  const encPath = path.join(root, '.env.enc');
  const passPath = path.join(root, '.passcode');
  const hasPlain = fs.existsSync(envPath);
  const hasEnc = fs.existsSync(encPath);
  const hasPass = fs.existsSync(passPath);

  if (!hasPlain && !hasEnc) return; // settings come from the server environment

  const fromEnv = process.env.ENV_PASSCODE;
  delete process.env.ENV_PASSCODE; // never visible to the rest of the app
  const interactive = !fromEnv;
  if (interactive && !process.stdin.isTTY) {
    throw new Error('A passcode is needed to unlock .env: start interactively or set ENV_PASSCODE.');
  }

  const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;
  const ask = (q: string) => new Promise<string>((resolve) => rl!.question(q, (a) => resolve(a.trim())));
  try {
    if (hasPlain) {
      const plain = fs.readFileSync(envPath, 'utf8');
      let passcode: string;
      if (!hasPass) {
        passcode = fromEnv ?? (await ask('Set an initial passcode to encrypt environment variables: '));
        if (!passcode) throw new Error('Passcode must not be empty.');
        fs.writeFileSync(passPath, hashPasscode(passcode), { encoding: 'utf8' });
      } else {
        passcode = fromEnv ?? (await ask('Enter passcode to encrypt the new environment variables: '));
        if (!comparePasscode(passcode, fs.readFileSync(passPath, 'utf8'))) throw new Error('Passcode does not match.');
      }
      fs.writeFileSync(encPath, encrypt(plain, passcode));
      fs.unlinkSync(envPath);
      apply(plain);
      return;
    }

    if (!hasPass) throw new Error('.env.enc found but .passcode is missing; copy the plain .env in again.');
    const storedHash = fs.readFileSync(passPath, 'utf8');
    const passcode = fromEnv ?? (await ask('Enter passcode to decrypt environment variables: '));
    if (!comparePasscode(passcode, storedHash)) throw new Error('Passcode does not match.');
    const plain = decrypt(fs.readFileSync(encPath, 'utf8'), passcode);
    apply(plain);

    if (interactive && (await ask('Would you like to change the passcode? (y/n): ')).toLowerCase() === 'y') {
      const next = await ask('Enter new passcode: ');
      if (!next) throw new Error('Passcode must not be empty.');
      fs.writeFileSync(passPath, hashPasscode(next), { encoding: 'utf8' });
      fs.writeFileSync(encPath, encrypt(plain, next));
    }
  } finally {
    rl?.close();
  }
}
