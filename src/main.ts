import { unlockEnv } from './env-vault';

// Settings must be in process.env before anything that reads them while loading
// (e.g. auth.service.ts, grc-incidents.service.ts) is imported, so the app is
// loaded only after the encrypted .env has been unlocked.
unlockEnv()
  .then(() => import('./bootstrap'))
  .catch((err: Error) => {
    console.error(`[env] ${err.message}`);
    process.exit(1);
  });
