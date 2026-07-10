import crypto from 'node:crypto';
import { generateObject } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '../auth';
import { AI_AGENT_EMAIL, AI_AGENT_NAME } from '../constants';
import { prisma } from '../db';
import { MessageSender, Role, TicketStatus } from '../generated/prisma/client';
import { handleAutoResolveTicketJob } from './autoResolveTicketWorker';

vi.mock('ai', () => ({ generateObject: vi.fn() }));

const mockedGenerateObject = vi.mocked(generateObject);

async function ensureAiAgent(): Promise<{ id: string }> {
  const existing = await prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL }, select: { id: true } });
  if (existing) {
    return existing;
  }
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser({
    email: AI_AGENT_EMAIL,
    name: AI_AGENT_NAME,
    emailVerified: true,
    role: Role.agent,
  });
  return { id: user.id };
}

async function createOtherAgent(): Promise<{ id: string }> {
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser({
    email: `agent-${crypto.randomUUID()}@example.com`,
    name: 'Human Agent',
    emailVerified: true,
    role: Role.agent,
  });
  return { id: user.id };
}

async function createTicketAssignedTo(assignedAgentId: string | null) {
  return prisma.ticket.create({
    data: {
      subject: `Ticket ${crypto.randomUUID()}`,
      studentEmail: `student-${crypto.randomUUID()}@example.com`,
      assignedAgentId,
      messages: { create: { sender: MessageSender.student, body: 'test body' } },
    },
  });
}

describe('handleAutoResolveTicketJob', () => {
  let aiAgent: { id: string };

  beforeEach(async () => {
    aiAgent = await ensureAiAgent();
    mockedGenerateObject.mockReset();
  });

  it('resolves the ticket, keeps it assigned to AI, and posts an AI reply', async () => {
    const ticket = await createTicketAssignedTo(aiAgent.id);
    mockedGenerateObject.mockResolvedValue({
      object: { decision: 'resolve', reply: 'Here is how to fix it.' },
    } as never);

    await handleAutoResolveTicketJob({ data: { ticketId: ticket.id, subject: ticket.subject, body: 'test body' } });

    const updated = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
      include: { messages: { orderBy: { sentAt: 'asc' } } },
    });
    expect(updated.status).toBe(TicketStatus.resolved);
    expect(updated.resolvedByAi).toBe(true);
    expect(updated.resolvedAt).not.toBeNull();
    expect(updated.assignedAgentId).toBe(aiAgent.id);
    expect(updated.messages).toHaveLength(2);
    expect(updated.messages[1]).toMatchObject({ sender: MessageSender.ai, body: 'Here is how to fix it.' });
  });

  it('unassigns from AI when escalating', async () => {
    const ticket = await createTicketAssignedTo(aiAgent.id);
    mockedGenerateObject.mockResolvedValue({ object: { decision: 'escalate', reply: null } } as never);

    await handleAutoResolveTicketJob({ data: { ticketId: ticket.id, subject: ticket.subject, body: 'test body' } });

    const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(updated.assignedAgentId).toBeNull();
    expect(updated.status).toBe(TicketStatus.open);
  });

  it('does not clobber a manual reassignment made while escalating', async () => {
    const humanAgent = await createOtherAgent();
    const ticket = await createTicketAssignedTo(humanAgent.id);
    mockedGenerateObject.mockResolvedValue({ object: { decision: 'escalate', reply: null } } as never);

    await handleAutoResolveTicketJob({ data: { ticketId: ticket.id, subject: ticket.subject, body: 'test body' } });

    const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(updated.assignedAgentId).toBe(humanAgent.id);
  });
});
