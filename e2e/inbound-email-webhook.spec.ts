import crypto from 'node:crypto';
import { expect, test } from '@playwright/test';
import { SERVER_URL, WEBHOOK_SECRET } from './fixtures/test-env';

const webhookHeaders = { 'x-webhook-secret': WEBHOOK_SECRET };

function uniqueMessageId(): string {
  return `<${crypto.randomUUID()}@example.com>`;
}

function uniqueEmail(): string {
  return `student-${crypto.randomUUID()}@example.com`;
}

test.describe('POST /api/webhooks/inbound-email', () => {
  test('creates a new ticket for a fresh message', async ({ request }) => {
    const response = await request.post(`${SERVER_URL}/api/webhooks/inbound-email`, {
      headers: webhookHeaders,
      data: {
        from: uniqueEmail(),
        subject: 'Cannot log into my account',
        body: 'I keep getting an error when I try to log in.',
        messageId: uniqueMessageId(),
      },
    });

    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json).toEqual({ ticketId: expect.any(Number), isNewTicket: true });
  });

  test('threads a reply from the same sender onto the existing ticket', async ({ request }) => {
    const from = uniqueEmail();
    const firstMessageId = uniqueMessageId();

    const firstResponse = await request.post(`${SERVER_URL}/api/webhooks/inbound-email`, {
      headers: webhookHeaders,
      data: {
        from,
        subject: 'Printer not working',
        body: 'The printer in the library is jammed.',
        messageId: firstMessageId,
      },
    });
    expect(firstResponse.status()).toBe(201);
    const firstJson = await firstResponse.json();
    expect(firstJson.isNewTicket).toBe(true);

    const replyResponse = await request.post(`${SERVER_URL}/api/webhooks/inbound-email`, {
      headers: webhookHeaders,
      data: {
        from,
        subject: 'Re: Printer not working',
        body: 'Any update on this?',
        messageId: uniqueMessageId(),
        inReplyTo: firstMessageId,
      },
    });

    expect(replyResponse.status()).toBe(201);
    const replyJson = await replyResponse.json();
    expect(replyJson).toEqual({ ticketId: firstJson.ticketId, isNewTicket: false });
  });

  test('does not graft a reply onto another sender\'s ticket', async ({ request }) => {
    const originalSender = uniqueEmail();
    const originalMessageId = uniqueMessageId();

    const originalResponse = await request.post(`${SERVER_URL}/api/webhooks/inbound-email`, {
      headers: webhookHeaders,
      data: {
        from: originalSender,
        subject: 'Locked out of my dorm',
        body: 'I lost my key card.',
        messageId: originalMessageId,
      },
    });
    expect(originalResponse.status()).toBe(201);
    const originalJson = await originalResponse.json();
    expect(originalJson.isNewTicket).toBe(true);

    const impostorResponse = await request.post(`${SERVER_URL}/api/webhooks/inbound-email`, {
      headers: webhookHeaders,
      data: {
        from: uniqueEmail(),
        subject: 'Re: Locked out of my dorm',
        body: 'This is not actually my ticket.',
        messageId: uniqueMessageId(),
        inReplyTo: originalMessageId,
      },
    });

    expect(impostorResponse.status()).toBe(201);
    const impostorJson = await impostorResponse.json();
    expect(impostorJson.isNewTicket).toBe(true);
    expect(impostorJson.ticketId).not.toBe(originalJson.ticketId);
  });

  test('is idempotent when the same messageId is redelivered', async ({ request }) => {
    const payload = {
      from: uniqueEmail(),
      subject: 'Duplicate delivery test',
      body: 'Testing redelivery of the same email.',
      messageId: uniqueMessageId(),
    };

    const firstResponse = await request.post(`${SERVER_URL}/api/webhooks/inbound-email`, {
      headers: webhookHeaders,
      data: payload,
    });
    expect(firstResponse.status()).toBe(201);
    const firstJson = await firstResponse.json();
    expect(firstJson.isNewTicket).toBe(true);

    const redeliveredResponse = await request.post(`${SERVER_URL}/api/webhooks/inbound-email`, {
      headers: webhookHeaders,
      data: payload,
    });

    expect(redeliveredResponse.status()).toBe(200);
    const redeliveredJson = await redeliveredResponse.json();
    expect(redeliveredJson).toEqual({ ticketId: firstJson.ticketId, isNewTicket: false });
  });

  test('rejects a payload with a missing from address', async ({ request }) => {
    const response = await request.post(`${SERVER_URL}/api/webhooks/inbound-email`, {
      headers: webhookHeaders,
      data: {
        subject: 'No sender',
        body: 'This payload is missing a from address.',
        messageId: uniqueMessageId(),
      },
    });

    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
  });

  test('rejects a payload with a malformed from address', async ({ request }) => {
    const response = await request.post(`${SERVER_URL}/api/webhooks/inbound-email`, {
      headers: webhookHeaders,
      data: {
        from: 'not-an-email',
        subject: 'Bad sender format',
        body: 'This payload has an invalid from address.',
        messageId: uniqueMessageId(),
      },
    });

    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
  });

  test('rejects a payload with a missing messageId', async ({ request }) => {
    const response = await request.post(`${SERVER_URL}/api/webhooks/inbound-email`, {
      headers: webhookHeaders,
      data: {
        from: uniqueEmail(),
        subject: 'No message id',
        body: 'This payload is missing a messageId.',
      },
    });

    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
  });
});
