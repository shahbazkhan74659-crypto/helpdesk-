import path from 'node:path';
import { expect, test } from '@playwright/test';

const adminAuthFile = path.resolve(__dirname, '.auth/admin.json');
const agentAuthFile = path.resolve(__dirname, '.auth/agent.json');

test.describe('admin', () => {
  test.use({ storageState: adminAuthFile });

  test('can reach /users and sees the Users page', async ({ page }) => {
    await page.goto('/users');

    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  });
});

test.describe('agent', () => {
  test.use({ storageState: agentAuthFile });

  test('visiting /users is redirected to the home page', async ({ page }) => {
    await page.goto('/users');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
  });

  test('never sees the Users nav link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Users' })).not.toBeVisible();

    await page.goto('/users');
    await expect(page.getByRole('link', { name: 'Users' })).not.toBeVisible();
  });
});

test.describe('anonymous', () => {
  test('visiting /users directly is redirected to the home page', async ({ page }) => {
    await page.goto('/users');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
  });
});
