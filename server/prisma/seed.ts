import { auth } from '../src/auth';
import { config } from '../src/config';
import { prisma } from '../src/db';
import { Role } from '../src/generated/prisma/client';

async function main() {
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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
