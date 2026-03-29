import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

/**
 * When VERIFY_SSL=false (e.g. self-signed or custom CA in dev), outbound HTTPS skips cert verification.
 * VERIFY_SSL=true or unset = verify (use CA when CERT_PATH set, else default).
 */
export function isVerifySsl(): boolean {
  const v = (process.env.VERIFY_SSL || '').toLowerCase();
  return v !== 'false' && v !== '0';
}

let cachedAgent: https.Agent | null = null;
let cachedNoVerifyAgent: https.Agent | null = null;

function getCertPath(): string | null {
  const envPath = process.env.CERT_PATH || process.env.CERTS_PEM_PATH;
  if (envPath && envPath.trim()) return envPath.trim();
  // Default same location as new_adib_backend (project root)
  const defaultPath = path.join(process.cwd(), 'certs.pem');
  try {
    if (fs.existsSync(defaultPath)) return defaultPath;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Returns an https.Agent that uses the bank CA cert for verification.
 * Use for all outbound HTTPS calls to internal services (e.g. main backend IET validation).
 * Returns null if no cert path is configured (then use default Node trust store).
 */
export function getHttpsAgentWithCa(): https.Agent | null {
  if (cachedAgent !== null) return cachedAgent;

  const certPath = getCertPath();
  if (!certPath) return null;

  try {
    const cert = fs.readFileSync(certPath);
    cachedAgent = new https.Agent({
      ca: [cert],
      rejectUnauthorized: true,
    });
    return cachedAgent;
  } catch (err) {
    console.warn(
      `[Security] Failed to load CA cert from ${certPath}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Single agent for outbound HTTPS: respects VERIFY_SSL.
 * VERIFY_SSL=false → agent with rejectUnauthorized: false.
 * VERIFY_SSL=true or unset → getHttpsAgentWithCa() or null (default verify).
 */
export function getHttpsAgentForOutbound(): https.Agent | null {
  if (!isVerifySsl()) {
    if (!cachedNoVerifyAgent) {
      cachedNoVerifyAgent = new https.Agent({ rejectUnauthorized: false });
    }
    return cachedNoVerifyAgent;
  }
  return getHttpsAgentWithCa();
}

/**
 * In production we must never disable certificate verification.
 * Only allow rejectUnauthorized: false in development and only when explicitly enabled.
 */
export function isAllowSelfSignedCerts(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.ALLOW_SELF_SIGNED_CERTS === 'true';
}
