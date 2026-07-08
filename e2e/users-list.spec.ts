import path from 'node:path';
import { expect, test } from '@playwright/test';
import { AGENT_EMAIL } from './fixtures/agent-user';
import { ADMIN_EMAIL } from './fixtures/test-env';

const adminAuthFile = path.resolve(__dirname, '.auth/admin.json');

test.describe('users table content', () => {
  test.use({ storageState: adminAuthFile });

  test('lists the seeded admin and agent users with correct details', async ({ page }) => {
    await page.goto('/users');

    const headerRow = page.getByRole('row').nth(0);
    await expect(headerRow.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(headerRow.getByRole('columnheader', { name: 'Email' })).toBeVisible();
    await expect(headerRow.getByRole('columnheader', { name: 'Role' })).toBeVisible();
    await expect(headerRow.getByRole('columnheader', { name: 'Joined' })).toBeVisible();

    // There is no per-test DB reset, and other specs (e.g. user-management.spec.ts)
    // create/delete their own throwaway users in parallel, so the table can hold
    // more than just the two seeded rows at any given moment. Look up the seeded
    // admin/agent rows by their known email rather than asserting a total row
    // count or relying on row order.
    const adminRow = page.getByRole('row', { name: ADMIN_EMAIL });
    await expect(adminRow.getByRole('cell').nth(0)).toHaveText('Admin');
    await expect(adminRow.getByRole('cell').nth(1)).toHaveText(ADMIN_EMAIL);
    await expect(adminRow.getByRole('cell').nth(2)).toHaveText('admin');
    await expect(adminRow.getByRole('cell').nth(3)).toHaveText(/\d/);

    const agentRow = page.getByRole('row', { name: AGENT_EMAIL });
    await expect(agentRow.getByRole('cell').nth(0)).toHaveText('Test Agent');
    await expect(agentRow.getByRole('cell').nth(1)).toHaveText(AGENT_EMAIL);
    await expect(agentRow.getByRole('cell').nth(2)).toHaveText('agent');
    await expect(agentRow.getByRole('cell').nth(3)).toHaveText(/\d/);
  });
});
