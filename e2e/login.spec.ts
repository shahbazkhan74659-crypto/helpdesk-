import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './fixtures/test-env';

test('logs in with valid admin credentials and lands on the home page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByText('Admin', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(page.getByText('Admin', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
});

test('shows an error for the wrong password and stays on the login page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill('definitely-the-wrong-password');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('shows an error for a non-existent email and stays on the login page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`no-such-user-${Date.now()}@test.local`);
  await page.getByLabel('Password').fill('whatever-password-123');
  await page.getByRole('button', { name: 'Log in' }).click();

  // Better Auth returns the identical generic "Invalid email or password"
  // message for both a wrong password (previous test) and an unknown email
  // (this test) - confirmed directly against /api/auth/sign-in/email. No
  // user-enumeration signal to worry about here, so asserting the same text
  // as above is intentional, not an oversight.
  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test.describe('client-side validation', () => {
  test('requires an email', async ({ page }) => {
    let signInRequested = false;
    await page.route('**/sign-in/email', (route) => {
      signInRequested = true;
      return route.continue();
    });

    await page.goto('/login');
    await page.getByLabel('Password').fill('some-password-123');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/login$/);
    expect(signInRequested).toBe(false);
  });

  test('requires a password', async ({ page }) => {
    let signInRequested = false;
    await page.route('**/sign-in/email', (route) => {
      signInRequested = true;
      return route.continue();
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('someone@example.com');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page.getByLabel('Password')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/login$/);
    expect(signInRequested).toBe(false);
  });

  test('rejects a malformed email', async ({ page }) => {
    let signInRequested = false;
    await page.route('**/sign-in/email', (route) => {
      signInRequested = true;
      return route.continue();
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('some-password-123');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('Enter a valid email')).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/login$/);
    expect(signInRequested).toBe(false);
  });
});

test.describe('sign out', () => {
  // Deliberately logs in fresh here rather than reusing `adminAuthFile`: that
  // file's session token is shared with other specs (e.g. role-access.spec.ts)
  // that may run concurrently, and signing out invalidates the session
  // server-side - reusing it here would intermittently log those other tests
  // out mid-run.
  test('clears the session and returns to the login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign out' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Users' })).not.toBeVisible();
  });
});
