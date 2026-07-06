import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { config } from './config';
import { prisma } from './db';

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
    enabled: true,
    window: 60,
    max: 100,
    // Sign-in already gets a strict built-in rule (10s window, 3 requests) from
    // Better Auth's default special rules; enabling rate limiting here is what
    // activates it, since it's otherwise off outside NODE_ENV=production.
  },
  advanced: {
    useSecureCookies: config.NODE_ENV === 'production',
  },
  user: {
    additionalFields: {
      role: {
        type: ['admin', 'agent'],
        required: true,
        defaultValue: 'agent',
        input: false,
      },
    },
  },
});
