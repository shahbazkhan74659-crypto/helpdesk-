import { defineConfig, devices } from '@playwright/test';

// Dedicated ports so the e2e run can happen alongside the normal dev servers
// (localhost:3001 / 5173) without colliding with them.
const SERVER_PORT = 3002;
const CLIENT_PORT = 5174;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Both point at the .env.test config (separate DATABASE_URL/PORT), so
  // these servers never touch the dev database.
  webServer: [
    {
      command: 'npm run dev:test --workspace server',
      url: `http://localhost:${SERVER_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run dev --workspace client -- --mode test --port ${CLIENT_PORT}`,
      url: `http://localhost:${CLIENT_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
