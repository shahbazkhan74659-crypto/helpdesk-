import crypto from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../app';
import { auth } from '../auth';
import { prisma } from '../db';
import { MessageSender, Role } from '../generated/prisma/client';

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

async function createTicket(subject: string, studentEmail: string) {
  return prisma.ticket.create({
    data: {
      subject,
      studentEmail,
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
    const studentEmail = `student-${crypto.randomUUID()}@example.com`;
    const older = await createTicket('Older ticket', studentEmail);
    const newer = await createTicket('Newer ticket', studentEmail);

    const response = await request(app).get('/api/tickets').set('Cookie', cookie);

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
      .query({ sortBy: 'subject', sortDir: 'asc' })
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
});
