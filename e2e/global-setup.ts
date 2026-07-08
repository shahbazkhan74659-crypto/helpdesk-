import { execSync } from 'node:child_process';
import path from 'node:path';

// Brings the separate test database (server/.env.test) up to date with the
// latest migrations and reseeds the admin user before the suite runs.
export default async function globalSetup(): Promise<void> {
  const serverDir = path.resolve(__dirname, '..', 'server');
  execSync('npm run db:test:migrate', { cwd: serverDir, stdio: 'inherit' });
  execSync('npm run db:test:seed', { cwd: serverDir, stdio: 'inherit' });
}
