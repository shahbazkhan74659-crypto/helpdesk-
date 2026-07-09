import { Router } from 'express';
import { prisma } from '../db';
import { Role } from '../generated/prisma/client';
import { requireRole } from '../middleware/requireRole';

export const ticketsRouter = Router();

ticketsRouter.get('/', requireRole(Role.admin, Role.agent), async (_req, res) => {
  const tickets = await prisma.ticket.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ tickets });
});
