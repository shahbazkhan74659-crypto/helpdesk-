import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { Prisma, Role, TicketCategory, TicketPriority, TicketStatus } from '../generated/prisma/client';
import { requireRole } from '../middleware/requireRole';

export const ticketsRouter = Router();

const SORTABLE_FIELDS = ['subject', 'studentEmail', 'status', 'priority', 'category', 'createdAt'] as const;

const listTicketsQuerySchema = z.object({
  sortBy: z.enum(SORTABLE_FIELDS).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(Object.values(TicketStatus) as [TicketStatus, ...TicketStatus[]]).optional(),
  priority: z.enum(Object.values(TicketPriority) as [TicketPriority, ...TicketPriority[]]).optional(),
  category: z.enum(Object.values(TicketCategory) as [TicketCategory, ...TicketCategory[]]).optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

ticketsRouter.get('/', requireRole(Role.admin, Role.agent), async (req, res) => {
  const parsed = listTicketsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const { sortBy, sortDir, status, priority, category, search } = parsed.data;

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

  const tickets = await prisma.ticket.findMany({ where, orderBy: { [sortBy]: sortDir } });
  res.json({ tickets });
});
