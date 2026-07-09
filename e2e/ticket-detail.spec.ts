import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createTicketWithMessages } from './fixtures/ticket';

const agentAuthFile = path.resolve(__dirname, '.auth/agent.json');

test.describe('ticket detail', () => {
  test.use({ storageState: agentAuthFile });

  test('shows the ticket subject, student email, and original message', async ({ page }) => {
    const ticket = await createTicketWithMessages();

    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByRole('heading', { name: ticket.subject })).toBeVisible();
    await expect(page.getByText(`From ${ticket.studentEmail}`)).toBeVisible();
    await expect(page.getByText(ticket.originalMessageBody)).toBeVisible();
  });

  test('shows a pre-existing reply under Replies with its sender label', async ({ page }) => {
    const ticket = await createTicketWithMessages({ withAgentReply: true });

    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByRole('heading', { name: 'Replies' })).toBeVisible();
    const replyCard = page.getByText(ticket.replyBody!).locator('..');
    await expect(replyCard.getByText('Agent', { exact: true })).toBeVisible();
    await expect(page.getByText(ticket.replyBody!)).toBeVisible();
  });

  test('submitting a reply persists it across a page reload', async ({ page }) => {
    const ticket = await createTicketWithMessages();
    const replyText = `New reply from e2e ${randomUUID()}`;

    await page.goto(`/tickets/${ticket.id}`);

    await page.getByLabel('Reply').fill(replyText);
    await page.getByRole('button', { name: 'Send Reply' }).click();

    await expect(page.getByText(replyText)).toBeVisible();
    await expect(page.getByLabel('Reply')).toHaveValue('');

    await page.reload();

    await expect(page.getByRole('heading', { name: ticket.subject })).toBeVisible();
    await expect(page.getByText(replyText)).toBeVisible();
  });

  test('submitting an empty reply shows a validation message and adds nothing', async ({ page }) => {
    const ticket = await createTicketWithMessages();

    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByText('No replies yet.')).toBeVisible();

    await page.getByRole('button', { name: 'Send Reply' }).click();

    await expect(page.getByText('Reply cannot be empty')).toBeVisible();
    await expect(page.getByText('No replies yet.')).toBeVisible();
  });
});
