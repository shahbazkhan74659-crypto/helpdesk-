import path from 'node:path';
import dotenv from 'dotenv';

// The Playwright process itself never gets `server/.env.test` loaded into
// `process.env` (that only happens inside the server's own child process via
// `dev:test`/`db:test:*`'s cross-env), so anything here that needs to talk to
// the test DB or know the seeded admin credentials has to load it explicitly.
dotenv.config({ path: path.resolve(__dirname, '../../server/.env.test') });

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@test.local';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'test-admin-password-123';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set - is server/.env.test present and populated?');
}

export const DATABASE_URL = process.env.DATABASE_URL;
