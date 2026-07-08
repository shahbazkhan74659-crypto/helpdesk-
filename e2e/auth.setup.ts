import path from 'node:path';
import { expect, test as setup } from '@playwright/test';
import { AGENT_EMAIL, AGENT_PASSWORD, ensureAgentUser } from './fixtures/agent-user';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './fixtures/test-env';

const adminAuthFile = path.resolve(__dirname, '.auth/admin.json');
const agentAuthFile = path.resolve(__dirname, '.auth/agent.json');

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL('/');
  await page.context().storageState({ path: adminAuthFile });
});

setup('authenticate as agent', async ({ page }) => {
  await ensureAgentUser();

  await page.goto('/login');
  await page.getByLabel('Email').fill(AGENT_EMAIL);
  await page.getByLabel('Password').fill(AGENT_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL('/');
  await page.context().storageState({ path: agentAuthFile });
});
