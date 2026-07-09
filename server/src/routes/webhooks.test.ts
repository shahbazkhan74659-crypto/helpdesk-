import crypto from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../app';
import { config } from '../config';
import { prisma } from '../db';

const webhookHeaders = config.INBOUND_EMAIL_WEBHOOK_SECRET
  ? { 'x-webhook-secret': config.INBOUND_EMAIL_WEBHOOK_SECRET }
  : {};

function uniqueMessageId(): string {
  return `<${crypto.randomUUID()}@example.com>`;
}

function uniqueEmail(): string {
  return `student-${crypto.randomUUID()}@example.com`;
}

describe('POST /api/webhooks/inbound-email', () => {
  it('creates a new ticket for a fresh message', async () => {
    const response = await request(app)
      .post('/api/webhooks/inbound-email')
      .set(webhookHeaders)
      .send({
        from: uniqueEmail(),
        subject: 'Cannot log into my account',
        body: 'I keep getting an error when I try to log in.',
        messageId: uniqueMessageId(),
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ticketId: expect.any(Number), isNewTicket: true });
  });

  it('threads a reply from the same sender onto the existing ticket', async () => {
    const from = uniqueEmail();
    const firstMessageId = uniqueMessageId();

    const firstResponse = await request(app).post('/api/webhooks/inbound-email').set(webhookHeaders).send({
      from,
      subject: 'Printer not working',
      body: 'The printer in the library is jammed.',
      messageId: firstMessageId,
    });
    expect(firstResponse.status).toBe(201);
    expect(firstResponse.body.isNewTicket).toBe(true);

    const replyResponse = await request(app).post('/api/webhooks/inbound-email').set(webhookHeaders).send({
      from,
      subject: 'Re: Printer not working',
      body: 'Any update on this?',
      messageId: uniqueMessageId(),
      inReplyTo: firstMessageId,
    });

    expect(replyResponse.status).toBe(201);
    expect(replyResponse.body).toEqual({ ticketId: firstResponse.body.ticketId, isNewTicket: false });
  });

  it("does not graft a reply onto another sender's ticket", async () => {
    const originalSender = uniqueEmail();
    const originalMessageId = uniqueMessageId();

    const originalResponse = await request(app).post('/api/webhooks/inbound-email').set(webhookHeaders).send({
      from: originalSender,
      subject: 'Locked out of my dorm',
      body: 'I lost my key card.',
      messageId: originalMessageId,
    });
    expect(originalResponse.status).toBe(201);
    expect(originalResponse.body.isNewTicket).toBe(true);

    const impostorResponse = await request(app).post('/api/webhooks/inbound-email').set(webhookHeaders).send({
      from: uniqueEmail(),
      subject: 'Re: Locked out of my dorm',
      body: 'This is not actually my ticket.',
      messageId: uniqueMessageId(),
      inReplyTo: originalMessageId,
    });

    expect(impostorResponse.status).toBe(201);
    expect(impostorResponse.body.isNewTicket).toBe(true);
    expect(impostorResponse.body.ticketId).not.toBe(originalResponse.body.ticketId);
  });

  it('is idempotent when the same messageId is redelivered', async () => {
    const payload = {
      from: uniqueEmail(),
      subject: 'Duplicate delivery test',
      body: 'Testing redelivery of the same email.',
      messageId: uniqueMessageId(),
    };

    const firstResponse = await request(app).post('/api/webhooks/inbound-email').set(webhookHeaders).send(payload);
    expect(firstResponse.status).toBe(201);
    expect(firstResponse.body.isNewTicket).toBe(true);

    const redeliveredResponse = await request(app)
      .post('/api/webhooks/inbound-email')
      .set(webhookHeaders)
      .send(payload);

    expect(redeliveredResponse.status).toBe(200);
    expect(redeliveredResponse.body).toEqual({ ticketId: firstResponse.body.ticketId, isNewTicket: false });
  });

  it('rejects a payload with a missing from address', async () => {
    const response = await request(app).post('/api/webhooks/inbound-email').set(webhookHeaders).send({
      subject: 'No sender',
      body: 'This payload is missing a from address.',
      messageId: uniqueMessageId(),
    });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });

  it('rejects a payload with a malformed from address', async () => {
    const response = await request(app).post('/api/webhooks/inbound-email').set(webhookHeaders).send({
      from: 'not-an-email',
      subject: 'Bad sender format',
      body: 'This payload has an invalid from address.',
      messageId: uniqueMessageId(),
    });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });

  it('rejects a payload with a missing messageId', async () => {
    const response = await request(app).post('/api/webhooks/inbound-email').set(webhookHeaders).send({
      from: uniqueEmail(),
      subject: 'No message id',
      body: 'This payload is missing a messageId.',
    });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });

  it('strips HTML/script markup from the subject and body before storing', async () => {
    const response = await request(app)
      .post('/api/webhooks/inbound-email')
      .set(webhookHeaders)
      .send({
        from: uniqueEmail(),
        subject: '<img src=x onerror=alert(1)>Broken login',
        body: '<script>alert(1)</script>Please <b>help</b>, I cannot log in.',
        messageId: uniqueMessageId(),
      });

    expect(response.status).toBe(201);

    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: response.body.ticketId },
      include: { messages: true },
    });

    expect(ticket.subject).toBe('Broken login');
    expect(ticket.messages[0].body).toBe('Please help, I cannot log in.');
  });
});
