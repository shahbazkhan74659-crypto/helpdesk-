import crypto from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../app';
import { auth } from '../auth';
import { prisma } from '../db';
import { MessageSender, Role, TicketCategory, TicketPriority, TicketStatus } from '../generated/prisma/client';

const AGENT_PASSWORD = 'password1234';

async function createSignedInAgent(): Promise<string> {
  const email = `agent-${crypto.randomUUID()}@example.com`;

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(AGENT_PASSWORD);
  const user = await ctx.internalAdapter.createUser({
    email,
    name: 'Test Agent',
    emailVerified: true,
    role: Role.agent,
  });
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: hash,
  });

  const signInResponse = await request(app)
    .post('/api/auth/sign-in/email')
    .send({ email, password: AGENT_PASSWORD });

  const cookie = signInResponse.headers['set-cookie'];
  if (!cookie) {
    throw new Error('sign-in did not return a session cookie');
  }
  return cookie;
}

async function createTicket(
  subject: string,
  studentEmail: string,
  overrides: { status?: TicketStatus; priority?: TicketPriority; category?: TicketCategory } = {},
) {
  return prisma.ticket.create({
    data: {
      subject,
      studentEmail,
      ...overrides,
      messages: { create: { sender: MessageSender.student, body: 'test body' } },
    },
  });
}

describe('GET /api/tickets', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await request(app).get('/api/tickets');
    expect(response.status).toBe(401);
  });

  it('defaults to sorting by createdAt descending', async () => {
    const cookie = await createSignedInAgent();
    const suffix = crypto.randomUUID();
    const older = await createTicket(`Older ticket ${suffix}`, `student-${crypto.randomUUID()}@example.com`);
    const newer = await createTicket(`Newer ticket ${suffix}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app).get('/api/tickets').query({ search: suffix }).set('Cookie', cookie);

    expect(response.status).toBe(200);
    const ids = response.body.tickets.map((t: { id: number }) => t.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
  });

  it('sorts by a requested field and direction', async () => {
    const cookie = await createSignedInAgent();
    const suffix = crypto.randomUUID();
    const alpha = await createTicket(`Alpha ${suffix}`, `student-${crypto.randomUUID()}@example.com`);
    const zeta = await createTicket(`Zeta ${suffix}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .get('/api/tickets')
      .query({ sortBy: 'subject', sortDir: 'asc', search: suffix })
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    const ids = response.body.tickets.map((t: { id: number }) => t.id);
    expect(ids.indexOf(alpha.id)).toBeLessThan(ids.indexOf(zeta.id));
  });

  it('rejects a sortBy field that is not whitelisted', async () => {
    const cookie = await createSignedInAgent();

    const response = await request(app)
      .get('/api/tickets')
      .query({ sortBy: 'assignedAgentId' })
      .set('Cookie', cookie);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });

  it('rejects an invalid sortDir', async () => {
    const cookie = await createSignedInAgent();

    const response = await request(app)
      .get('/api/tickets')
      .query({ sortBy: 'createdAt', sortDir: 'sideways' })
      .set('Cookie', cookie);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });

  it('filters by status', async () => {
    const cookie = await createSignedInAgent();
    const suffix = crypto.randomUUID();
    const open = await createTicket(`Open ${suffix}`, `student-${crypto.randomUUID()}@example.com`, {
      status: TicketStatus.open,
    });
    const closed = await createTicket(`Closed ${suffix}`, `student-${crypto.randomUUID()}@example.com`, {
      status: TicketStatus.closed,
    });

    const response = await request(app).get('/api/tickets').query({ status: 'closed' }).set('Cookie', cookie);

    expect(response.status).toBe(200);
    const ids = response.body.tickets.map((t: { id: number }) => t.id);
    expect(ids).toContain(closed.id);
    expect(ids).not.toContain(open.id);
  });

  it('filters by priority', async () => {
    const cookie = await createSignedInAgent();
    const suffix = crypto.randomUUID();
    const urgent = await createTicket(`Urgent ${suffix}`, `student-${crypto.randomUUID()}@example.com`, {
      priority: TicketPriority.urgent,
    });
    const low = await createTicket(`Low ${suffix}`, `student-${crypto.randomUUID()}@example.com`, {
      priority: TicketPriority.low,
    });

    const response = await request(app).get('/api/tickets').query({ priority: 'urgent' }).set('Cookie', cookie);

    expect(response.status).toBe(200);
    const ids = response.body.tickets.map((t: { id: number }) => t.id);
    expect(ids).toContain(urgent.id);
    expect(ids).not.toContain(low.id);
  });

  it('filters by category', async () => {
    const cookie = await createSignedInAgent();
    const suffix = crypto.randomUUID();
    const refund = await createTicket(`Refund ${suffix}`, `student-${crypto.randomUUID()}@example.com`, {
      category: TicketCategory.refund_request,
    });
    const technical = await createTicket(`Technical ${suffix}`, `student-${crypto.randomUUID()}@example.com`, {
      category: TicketCategory.technical_question,
    });

    const response = await request(app)
      .get('/api/tickets')
      .query({ category: 'refund_request' })
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    const ids = response.body.tickets.map((t: { id: number }) => t.id);
    expect(ids).toContain(refund.id);
    expect(ids).not.toContain(technical.id);
  });

  it('searches by subject, case-insensitively', async () => {
    const cookie = await createSignedInAgent();
    const suffix = crypto.randomUUID();
    const match = await createTicket(`Printer JAMMED ${suffix}`, `student-${crypto.randomUUID()}@example.com`);
    const nonMatch = await createTicket(`Other ${suffix}`, `other-${crypto.randomUUID()}@example.com`);

    const response = await request(app).get('/api/tickets').query({ search: `jammed ${suffix}` }).set('Cookie', cookie);

    expect(response.status).toBe(200);
    const ids = response.body.tickets.map((t: { id: number }) => t.id);
    expect(ids).toContain(match.id);
    expect(ids).not.toContain(nonMatch.id);
  });

  it('searches by requester email', async () => {
    const cookie = await createSignedInAgent();
    const suffix = crypto.randomUUID();
    const match = await createTicket(`Ticket ${suffix}`, `jammed-${suffix}@example.com`);
    const nonMatch = await createTicket(`Ticket ${suffix} other`, `other-${crypto.randomUUID()}@example.com`);

    const response = await request(app).get('/api/tickets').query({ search: `jammed-${suffix}` }).set('Cookie', cookie);

    expect(response.status).toBe(200);
    const ids = response.body.tickets.map((t: { id: number }) => t.id);
    expect(ids).toContain(match.id);
    expect(ids).not.toContain(nonMatch.id);
  });

  it('rejects a status filter that is not a valid TicketStatus', async () => {
    const cookie = await createSignedInAgent();

    const response = await request(app).get('/api/tickets').query({ status: 'archived' }).set('Cookie', cookie);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });

  it('defaults to 10 tickets per page and reports the total count', async () => {
    const cookie = await createSignedInAgent();
    const suffix = crypto.randomUUID();
    for (let i = 0; i < 15; i++) {
      await createTicket(`Paginated ${suffix} #${i}`, `student-${crypto.randomUUID()}@example.com`);
    }

    const response = await request(app).get('/api/tickets').query({ search: suffix }).set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.tickets).toHaveLength(10);
    expect(response.body.total).toBe(15);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(10);
  });

  it('returns the remaining tickets on the second page with no overlap', async () => {
    const cookie = await createSignedInAgent();
    const suffix = crypto.randomUUID();
    for (let i = 0; i < 15; i++) {
      await createTicket(`Paginated ${suffix} #${i}`, `student-${crypto.randomUUID()}@example.com`);
    }

    const firstPage = await request(app).get('/api/tickets').query({ search: suffix, page: 1 }).set('Cookie', cookie);
    const secondPage = await request(app)
      .get('/api/tickets')
      .query({ search: suffix, page: 2 })
      .set('Cookie', cookie);

    expect(firstPage.body.tickets).toHaveLength(10);
    expect(secondPage.body.tickets).toHaveLength(5);

    const firstIds = firstPage.body.tickets.map((t: { id: number }) => t.id);
    const secondIds = secondPage.body.tickets.map((t: { id: number }) => t.id);
    expect(firstIds.filter((id: number) => secondIds.includes(id))).toHaveLength(0);
  });

  it('respects a custom pageSize', async () => {
    const cookie = await createSignedInAgent();
    const suffix = crypto.randomUUID();
    for (let i = 0; i < 15; i++) {
      await createTicket(`Paginated ${suffix} #${i}`, `student-${crypto.randomUUID()}@example.com`);
    }

    const response = await request(app)
      .get('/api/tickets')
      .query({ search: suffix, pageSize: 5 })
      .set('Cookie', cookie);

    expect(response.body.tickets).toHaveLength(5);
    expect(response.body.total).toBe(15);
  });

  it('rejects an out-of-range pageSize', async () => {
    const cookie = await createSignedInAgent();

    const response = await request(app).get('/api/tickets').query({ pageSize: 101 }).set('Cookie', cookie);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });

  it('rejects a page number below 1', async () => {
    const cookie = await createSignedInAgent();

    const response = await request(app).get('/api/tickets').query({ page: 0 }).set('Cookie', cookie);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });
});

describe('GET /api/tickets/:id', () => {
  it('rejects unauthenticated requests', async () => {
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app).get(`/api/tickets/${ticket.id}`);

    expect(response.status).toBe(401);
  });

  it('returns the ticket with its messages in send order', async () => {
    const cookie = await createSignedInAgent();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);
    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, sender: MessageSender.agent, body: 'Reply body' },
    });

    const response = await request(app).get(`/api/tickets/${ticket.id}`).set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ticket.id);
    expect(response.body.subject).toBe(ticket.subject);
    expect(response.body.messages).toHaveLength(2);
    expect(response.body.messages[0].body).toBe('test body');
    expect(response.body.messages[1].body).toBe('Reply body');
  });

  it('returns 404 for a ticket that does not exist', async () => {
    const cookie = await createSignedInAgent();

    const response = await request(app).get('/api/tickets/999999999').set('Cookie', cookie);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
  });

  it('rejects a non-numeric id', async () => {
    const cookie = await createSignedInAgent();

    const response = await request(app).get('/api/tickets/not-a-number').set('Cookie', cookie);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });
});
