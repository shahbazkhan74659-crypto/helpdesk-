import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { config } from './config';
import { prisma } from './db';
import { Role } from './generated/prisma/client';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  trustedOrigins: [config.CLIENT_URL],
  rateLimit: {
    // Better Auth already defaults to enabled-in-production/disabled-elsewhere;
    // this is explicit so it doesn't silently change if that default ever does.
    enabled: config.NODE_ENV === 'production',
    window: 60,
    max: 100,
    // Sign-in also gets a strict built-in rule (10s window, 3 requests) from
    // Better Auth's default special rules once rate limiting is enabled.
  },
  advanced: {
    useSecureCookies: config.NODE_ENV === 'production',
  },
  user: {
    additionalFields: {
      role: {
        type: [Role.admin, Role.agent],
        required: true,
        defaultValue: Role.agent,
        input: false,
      },
    },
  },
});
