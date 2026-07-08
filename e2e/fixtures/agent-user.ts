import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
// There is no seeded agent-role user (globalSetup only seeds the one admin
// from server/.env.test), and no admin-invite UI/API yet to create one
// through the app. Created directly via Prisma against the test DB only,
// scoped by DATABASE_URL from server/.env.test.
import { PrismaClient } from '../../server/src/generated/prisma/client';
import { DATABASE_URL } from './test-env';

export const AGENT_EMAIL = 'agent@test.local';
export const AGENT_PASSWORD = 'test-agent-password-123';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

// Idempotent: safe to call every run since there's no per-test DB reset, only
// a per-full-run one via globalSetup. Also tolerates a create/create race
// between parallel workers by falling back to a re-read on a unique-
// constraint violation, rather than assuming this is the only caller.
export async function ensureAgentUser(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: AGENT_EMAIL } });
  if (existing) {
    return;
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(AGENT_PASSWORD);

  try {
    await prisma.user.create({
      data: {
        id: userId,
        name: 'Test Agent',
        email: AGENT_EMAIL,
        emailVerified: true,
        role: 'agent',
        accounts: {
          create: {
            id: randomUUID(),
            accountId: userId,
            providerId: 'credential',
            password: passwordHash,
          },
        },
      },
    });
  } catch (error) {
    const nowExists = await prisma.user.findUnique({ where: { email: AGENT_EMAIL } });
    if (!nowExists) {
      throw error;
    }
  }
}
