import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  // Better Auth (email/password, database sessions).
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().min(1, 'BETTER_AUTH_URL is required'),

  // Seed admin user credentials (server/prisma/seed.ts). Only needed when seeding.
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().min(12, 'ADMIN_PASSWORD must be at least 12 characters').optional(),

  // Gmail API (email intake) - separate Google Cloud OAuth client.
  // Unset until Phase 4 (email intake) wires it up.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // Anthropic Claude API - unset until Phase 6 (AI classification/summaries).
  ANTHROPIC_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', z.treeifyError(parsed.error));
  throw new Error('Invalid environment configuration');
}

if (parsed.data.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
  throw new Error('CLIENT_URL is required in production');
}

export const config = parsed.data;
