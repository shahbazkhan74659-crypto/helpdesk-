import { execSync } from 'node:child_process';

// Brings the isolated test database (server/.env.test) up to date with the
// latest migrations before the suite runs - mirrors e2e/global-setup.ts's
// migrate step (no seed step needed here since these tests don't depend on
// the seeded admin user).
export default async function globalSetup(): Promise<void> {
  execSync('npm run db:test:migrate', { cwd: __dirname, stdio: 'inherit' });
}
