import path from 'node:path';
import { expect, test } from '@playwright/test';

const adminAuthFile = path.resolve(__dirname, '.auth/admin.json');

test.describe('user management CRUD', () => {
  test.use({ storageState: adminAuthFile });

  test('admin can create, edit, and delete a user', async ({ page }) => {
    const timestamp = Date.now();
    const name = 'E2E Crud User';
    const email = `e2e-crud-${timestamp}@test.local`;
    const updatedName = 'E2E Crud User Updated';
    const updatedEmail = `e2e-crud-updated-${timestamp}@test.local`;
    const password = 'e2e-crud-password-123';

    await page.goto('/users');

    await page.getByRole('button', { name: 'Create user' }).click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog.getByRole('heading', { name: 'Create user' })).toBeVisible();
    await createDialog.getByLabel('Name').fill(name);
    await createDialog.getByLabel('Email').fill(email);
    await createDialog.getByLabel('Password').fill(password);
    await createDialog.getByRole('button', { name: 'Create user' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    const createdRow = page.getByRole('row', { name: email });
    await expect(createdRow).toBeVisible();
    await expect(createdRow.getByRole('cell').nth(0)).toHaveText(name);
    await expect(createdRow.getByRole('cell').nth(1)).toHaveText(email);
    await expect(createdRow.getByRole('cell').nth(2)).toHaveText('agent');

    await page.getByRole('button', { name: `Edit ${name}` }).click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByRole('heading', { name: 'Edit user' })).toBeVisible();
    await expect(editDialog.getByLabel('Name')).toHaveValue(name);
    await expect(editDialog.getByLabel('Email')).toHaveValue(email);
    await expect(editDialog.getByText('Leave blank to keep the current password.')).toBeVisible();
    await editDialog.getByLabel('Name').fill(updatedName);
    await editDialog.getByLabel('Email').fill(updatedEmail);
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    const updatedRow = page.getByRole('row', { name: updatedEmail });
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow.getByRole('cell').nth(0)).toHaveText(updatedName);
    await expect(updatedRow.getByRole('cell').nth(1)).toHaveText(updatedEmail);
    await expect(page.getByRole('row', { name: email })).toHaveCount(0);

    await page.getByRole('button', { name: `Delete ${updatedName}` }).click();
    const deleteDialog = page.getByRole('dialog');
    await expect(deleteDialog.getByRole('heading', { name: 'Delete user' })).toBeVisible();
    await expect(deleteDialog.getByText(updatedName)).toBeVisible();
    await expect(deleteDialog.getByText(updatedEmail)).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await expect(page.getByRole('row', { name: updatedEmail })).toHaveCount(0);
  });
});
