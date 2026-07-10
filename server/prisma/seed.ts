import { auth } from '../src/auth';
import { config } from '../src/config';
import { AI_AGENT_EMAIL, AI_AGENT_NAME } from '../src/constants';
import { prisma } from '../src/db';
import { Role } from '../src/generated/prisma/client';

async function seedAdmin() {
  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin user');
  }

  const email = config.ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(config.ADMIN_PASSWORD);
  const user = await ctx.internalAdapter.createUser({
    email,
    name: 'Admin',
    emailVerified: true,
    role: Role.admin,
  });
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: hash,
  });

  console.log(`Seeded admin user: ${email}`);
}

async function seedAiAgent() {
  const existing = await prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL } });
  if (existing) {
    console.log(`AI agent user already exists: ${AI_AGENT_EMAIL}`);
    return;
  }

  const ctx = await auth.$context;
  await ctx.internalAdapter.createUser({
    email: AI_AGENT_EMAIL,
    name: AI_AGENT_NAME,
    emailVerified: true,
    role: Role.agent,
  });

  console.log(`Seeded AI agent user: ${AI_AGENT_EMAIL}`);
}

async function main() {
  await seedAdmin();
  await seedAiAgent();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
