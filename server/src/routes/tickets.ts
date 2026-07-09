import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { Role } from '../generated/prisma/client';
import { requireRole } from '../middleware/requireRole';

export const ticketsRouter = Router();

const SORTABLE_FIELDS = ['subject', 'studentEmail', 'status', 'priority', 'category', 'createdAt'] as const;

const listTicketsQuerySchema = z.object({
  sortBy: z.enum(SORTABLE_FIELDS).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

ticketsRouter.get('/', requireRole(Role.admin, Role.agent), async (req, res) => {
  const parsed = listTicketsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const { sortBy, sortDir } = parsed.data;
  const tickets = await prisma.ticket.findMany({ orderBy: { [sortBy]: sortDir } });
  res.json({ tickets });
});
