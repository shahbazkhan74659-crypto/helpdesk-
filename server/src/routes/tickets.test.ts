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

async function createSignedInAdmin(): Promise<string> {
  const email = `admin-${crypto.randomUUID()}@example.com`;

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(AGENT_PASSWORD);
  const user = await ctx.internalAdapter.createUser({
    email,
    name: 'Test Admin',
    emailVerified: true,
    role: Role.admin,
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

async function createAgent(name = 'Assignable Agent') {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(AGENT_PASSWORD);
  const user = await ctx.internalAdapter.createUser({
    email: `agent-${crypto.randomUUID()}@example.com`,
    name,
    emailVerified: true,
    role: Role.agent,
  });
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: hash,
  });
  return user;
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

  it('includes the assigned agent when the ticket has one', async () => {
    const cookie = await createSignedInAgent();
    const agent = await createAgent('Assigned Agent');
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);
    await prisma.ticket.update({ where: { id: ticket.id }, data: { assignedAgentId: agent.id } });

    const response = await request(app).get(`/api/tickets/${ticket.id}`).set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.assignedAgent).toEqual({ id: agent.id, name: agent.name, email: agent.email });
  });
});

describe('PATCH /api/tickets/:id/assign', () => {
  it('rejects unauthenticated requests', async () => {
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app).patch(`/api/tickets/${ticket.id}/assign`).send({ assignedAgentId: null });

    expect(response.status).toBe(401);
  });

  it('assigns the ticket to an agent and bumps updatedAt', async () => {
    const cookie = await createSignedInAgent();
    const agent = await createAgent();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}/assign`)
      .set('Cookie', cookie)
      .send({ assignedAgentId: agent.id });

    expect(response.status).toBe(200);
    expect(response.body.assignedAgent).toEqual({ id: agent.id, name: agent.name, email: agent.email });
    expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(new Date(ticket.updatedAt).getTime());
  });

  it('unassigns the ticket when assignedAgentId is null', async () => {
    const cookie = await createSignedInAgent();
    const agent = await createAgent();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);
    await prisma.ticket.update({ where: { id: ticket.id }, data: { assignedAgentId: agent.id } });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}/assign`)
      .set('Cookie', cookie)
      .send({ assignedAgentId: null });

    expect(response.status).toBe(200);
    expect(response.body.assignedAgent).toBeNull();
  });

  it('rejects assigning to a user that is not an agent', async () => {
    const cookie = await createSignedInAgent();
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(AGENT_PASSWORD);
    const admin = await ctx.internalAdapter.createUser({
      email: `admin-${crypto.randomUUID()}@example.com`,
      name: 'Some Admin',
      emailVerified: true,
      role: Role.admin,
    });
    await ctx.internalAdapter.linkAccount({
      userId: admin.id,
      providerId: 'credential',
      accountId: admin.id,
      password: hash,
    });
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}/assign`)
      .set('Cookie', cookie)
      .send({ assignedAgentId: admin.id });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_agent' });
  });

  it('rejects an unknown agent id', async () => {
    const cookie = await createSignedInAgent();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}/assign`)
      .set('Cookie', cookie)
      .send({ assignedAgentId: 'does-not-exist' });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_agent' });
  });

  it('returns 404 for a ticket that does not exist', async () => {
    const cookie = await createSignedInAgent();

    const response = await request(app)
      .patch('/api/tickets/999999999/assign')
      .set('Cookie', cookie)
      .send({ assignedAgentId: null });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
  });
});

describe('PATCH /api/tickets/:id/status', () => {
  it('rejects unauthenticated requests', async () => {
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .send({ status: 'resolved' });

    expect(response.status).toBe(401);
  });

  it('updates the status and bumps updatedAt', async () => {
    const cookie = await createSignedInAgent();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`, {
      status: TicketStatus.open,
    });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'resolved' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('resolved');
    expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(new Date(ticket.updatedAt).getTime());
  });

  it('rejects an invalid status value', async () => {
    const cookie = await createSignedInAgent();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'archived' });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });

  it('returns 404 for a ticket that does not exist', async () => {
    const cookie = await createSignedInAgent();

    const response = await request(app)
      .patch('/api/tickets/999999999/status')
      .set('Cookie', cookie)
      .send({ status: 'resolved' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
  });
});

describe('PATCH /api/tickets/:id/category', () => {
  it('rejects unauthenticated requests', async () => {
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}/category`)
      .send({ category: 'refund_request' });

    expect(response.status).toBe(401);
  });

  it('updates the category and bumps updatedAt', async () => {
    const cookie = await createSignedInAgent();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}/category`)
      .set('Cookie', cookie)
      .send({ category: 'refund_request' });

    expect(response.status).toBe(200);
    expect(response.body.category).toBe('refund_request');
    expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(new Date(ticket.updatedAt).getTime());
  });

  it('clears the category when null is sent', async () => {
    const cookie = await createSignedInAgent();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`, {
      category: TicketCategory.technical_question,
    });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}/category`)
      .set('Cookie', cookie)
      .send({ category: null });

    expect(response.status).toBe(200);
    expect(response.body.category).toBeNull();
  });

  it('rejects an invalid category value', async () => {
    const cookie = await createSignedInAgent();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}/category`)
      .set('Cookie', cookie)
      .send({ category: 'not_a_category' });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });

  it('returns 404 for a ticket that does not exist', async () => {
    const cookie = await createSignedInAgent();

    const response = await request(app)
      .patch('/api/tickets/999999999/category')
      .set('Cookie', cookie)
      .send({ category: null });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
  });
});

describe('POST /api/tickets/:id/messages', () => {
  it('rejects unauthenticated requests', async () => {
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/messages`)
      .send({ body: 'Thanks for reaching out.' });

    expect(response.status).toBe(401);
  });

  it('adds an agent message to the thread and bumps updatedAt', async () => {
    const cookie = await createSignedInAgent();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/messages`)
      .set('Cookie', cookie)
      .send({ body: 'Thanks for reaching out.' });

    expect(response.status).toBe(201);
    expect(response.body.messages).toHaveLength(2);
    const reply = response.body.messages[1];
    expect(reply.body).toBe('Thanks for reaching out.');
    expect(reply.sender).toBe('agent');
    expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(new Date(ticket.updatedAt).getTime());
  });

  it('records the message sender as admin when an admin replies', async () => {
    const cookie = await createSignedInAdmin();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/messages`)
      .set('Cookie', cookie)
      .send({ body: 'Thanks for reaching out.' });

    expect(response.status).toBe(201);
    const reply = response.body.messages[1];
    expect(reply.sender).toBe('admin');
  });

  it('rejects an empty body', async () => {
    const cookie = await createSignedInAgent();
    const ticket = await createTicket(`Ticket ${crypto.randomUUID()}`, `student-${crypto.randomUUID()}@example.com`);

    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/messages`)
      .set('Cookie', cookie)
      .send({ body: '   ' });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });

  it('returns 404 for a ticket that does not exist', async () => {
    const cookie = await createSignedInAgent();

    const response = await request(app)
      .post('/api/tickets/999999999/messages')
      .set('Cookie', cookie)
      .send({ body: 'Thanks for reaching out.', senderType: 'agent' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
  });
});
