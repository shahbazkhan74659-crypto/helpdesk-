import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { MessageSender, Prisma, Role, TicketCategory, TicketPriority, TicketStatus } from '../generated/prisma/client';
import { requireRole } from '../middleware/requireRole';

export const ticketsRouter = Router();

const SORTABLE_FIELDS = ['subject', 'studentEmail', 'status', 'priority', 'category', 'createdAt'] as const;

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const listTicketsQuerySchema = z.object({
  sortBy: z.enum(SORTABLE_FIELDS).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(Object.values(TicketStatus) as [TicketStatus, ...TicketStatus[]]).optional(),
  priority: z.enum(Object.values(TicketPriority) as [TicketPriority, ...TicketPriority[]]).optional(),
  category: z.enum(Object.values(TicketCategory) as [TicketCategory, ...TicketCategory[]]).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

ticketsRouter.get('/', requireRole(Role.admin, Role.agent), async (req, res) => {
  const parsed = listTicketsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const { sortBy, sortDir, status, priority, category, search, page, pageSize } = parsed.data;

  const where: Prisma.TicketWhereInput = {
    status,
    priority,
    category,
    ...(search && {
      OR: [
        { subject: { contains: search, mode: 'insensitive' } },
        { studentEmail: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total, page, pageSize });
});

const ticketIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

ticketsRouter.get('/:id', requireRole(Role.admin, Role.agent), async (req, res) => {
  const parsed = ticketIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: parsed.data.id },
    include: {
      messages: { orderBy: { sentAt: 'asc' } },
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.json(ticket);
});

const assignTicketSchema = z.object({
  assignedAgentId: z.string().min(1).nullable(),
});

ticketsRouter.patch('/:id/assign', requireRole(Role.admin, Role.agent), async (req, res) => {
  const paramsParsed = ticketIdParamsSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const bodyParsed = assignTicketSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const { assignedAgentId } = bodyParsed.data;

  if (assignedAgentId) {
    const agent = await prisma.user.findUnique({ where: { id: assignedAgentId } });
    if (!agent || agent.role !== Role.agent) {
      res.status(422).json({ error: 'invalid_agent' });
      return;
    }
  }

  const existing = await prisma.ticket.findUnique({ where: { id: paramsParsed.data.id } });
  if (!existing) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const ticket = await prisma.ticket.update({
    where: { id: paramsParsed.data.id },
    data: { assignedAgentId },
    include: {
      messages: { orderBy: { sentAt: 'asc' } },
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(ticket);
});

const updateStatusSchema = z.object({
  status: z.enum(Object.values(TicketStatus) as [TicketStatus, ...TicketStatus[]]),
});

ticketsRouter.patch('/:id/status', requireRole(Role.admin, Role.agent), async (req, res) => {
  const paramsParsed = ticketIdParamsSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const bodyParsed = updateStatusSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const existing = await prisma.ticket.findUnique({ where: { id: paramsParsed.data.id } });
  if (!existing) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const ticket = await prisma.ticket.update({
    where: { id: paramsParsed.data.id },
    data: { status: bodyParsed.data.status },
    include: {
      messages: { orderBy: { sentAt: 'asc' } },
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(ticket);
});

const updateCategorySchema = z.object({
  category: z.enum(Object.values(TicketCategory) as [TicketCategory, ...TicketCategory[]]).nullable(),
});

ticketsRouter.patch('/:id/category', requireRole(Role.admin, Role.agent), async (req, res) => {
  const paramsParsed = ticketIdParamsSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const bodyParsed = updateCategorySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const existing = await prisma.ticket.findUnique({ where: { id: paramsParsed.data.id } });
  if (!existing) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const ticket = await prisma.ticket.update({
    where: { id: paramsParsed.data.id },
    data: { category: bodyParsed.data.category },
    include: {
      messages: { orderBy: { sentAt: 'asc' } },
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(ticket);
});

const addMessageSchema = z.object({
  body: z.string().trim().min(1),
});

ticketsRouter.post('/:id/messages', requireRole(Role.admin, Role.agent), async (req, res) => {
  const paramsParsed = ticketIdParamsSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const bodyParsed = addMessageSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const existing = await prisma.ticket.findUnique({ where: { id: paramsParsed.data.id } });
  if (!existing) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const sender = req.session.user.role === Role.admin ? MessageSender.admin : MessageSender.agent;

  await prisma.ticketMessage.create({
    data: { ticketId: paramsParsed.data.id, sender, body: bodyParsed.data.body },
  });

  const ticket = await prisma.ticket.update({
    where: { id: paramsParsed.data.id },
    data: { updatedAt: new Date() },
    include: {
      messages: { orderBy: { sentAt: 'asc' } },
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json(ticket);
});

const polishReplySchema = z.object({
  body: z.string().trim().min(1),
});

ticketsRouter.post('/:id/polish-reply', requireRole(Role.admin, Role.agent), async (req, res) => {
  const paramsParsed = ticketIdParamsSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const bodyParsed = polishReplySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: paramsParsed.data.id },
    include: { messages: { orderBy: { sentAt: 'asc' }, take: 1 } },
  });

  if (!ticket) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const originalMessage = ticket.messages[0]?.body ?? '';

  try {
    const { text } = await generateText({
      model: openai('gpt-5-nano'),
      system:
        'You are an assistant helping a support agent polish a reply to a student support ticket. ' +
        'Improve clarity, grammar, and tone while keeping the meaning, facts, and intent unchanged. ' +
        'Keep the same language and roughly the same length. Return only the improved reply text, with no preamble or quotes.',
      prompt: `Student's ticket subject: ${ticket.subject}\nStudent's original message: ${originalMessage}\n\nAgent's draft reply to polish:\n${bodyParsed.data.body}`,
    });

    res.json({ body: text.trim() });
  } catch (error) {
    console.error('Failed to polish reply:', error);
    res.status(502).json({ error: 'polish_failed' });
  }
});

const summarySenderLabel: Record<MessageSender, string> = {
  [MessageSender.student]: 'Student',
  [MessageSender.agent]: 'Agent',
  [MessageSender.admin]: 'Admin',
  [MessageSender.ai]: 'AI',
};

ticketsRouter.post('/:id/summarize', requireRole(Role.admin, Role.agent), async (req, res) => {
  const paramsParsed = ticketIdParamsSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: paramsParsed.data.id },
    include: { messages: { orderBy: { sentAt: 'asc' } } },
  });

  if (!ticket) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const conversation = ticket.messages
    .map((message) => `${summarySenderLabel[message.sender]}: ${message.body}`)
    .join('\n\n');

  try {
    const { text } = await generateText({
      model: openai('gpt-5-nano'),
      system:
        'You are an assistant helping a support agent quickly understand a student support ticket. ' +
        'Summarize the issue and the conversation so far in 2-4 concise sentences: what the student needs, ' +
        "what's been discussed or tried, and the current status. Return only the summary text, with no preamble or quotes.",
      prompt: `Ticket subject: ${ticket.subject}\nStudent: ${ticket.studentEmail}\n\nConversation:\n${conversation}`,
    });

    res.json({ summary: text.trim() });
  } catch (error) {
    console.error('Failed to summarize ticket:', error);
    res.status(502).json({ error: 'summarize_failed' });
  }
});
