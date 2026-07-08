import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../auth';
import { prisma } from '../db';
import { Role } from '../generated/prisma/client';
import { requireRole } from '../middleware/requireRole';

export const usersRouter = Router();

usersRouter.get('/', requireRole('admin'), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  res.json({ users });
});

const createUserSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().trim().min(8, 'Password must be at least 8 characters'),
});

usersRouter.post('/', requireRole('admin'), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'email_taken' });
    return;
  }

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(parsed.data.password);
  const user = await ctx.internalAdapter.createUser({
    email,
    name: parsed.data.name,
    emailVerified: true,
    role: Role.agent,
  });
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: hash,
  });

  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
  });
});

const editUserSchema = createUserSchema.extend({
  password: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length >= 8, {
      message: 'Password must be at least 8 characters',
    })
    .optional(),
});

usersRouter.patch('/:id', requireRole('admin'), async (req, res) => {
  const parsed = editUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const id = req.params.id as string;
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    res.status(404).json({ error: 'user_not_found' });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== id) {
    res.status(409).json({ error: 'email_taken' });
    return;
  }

  const ctx = await auth.$context;
  await ctx.internalAdapter.updateUser(id, {
    name: parsed.data.name,
    email,
  });

  if (parsed.data.password) {
    const hash = await ctx.password.hash(parsed.data.password);
    await ctx.internalAdapter.updatePassword(id, hash);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id } });
  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
  });
});
