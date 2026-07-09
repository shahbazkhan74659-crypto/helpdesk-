import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { Prisma, Role, TicketCategory, TicketPriority, TicketStatus } from '../generated/prisma/client';
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
    include: { messages: { orderBy: { sentAt: 'asc' } } },
  });

  if (!ticket) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.json(ticket);
});
