import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Google OAuth (Admin/Agent sign-in) and Gmail API (email intake) share
  // one Google Cloud OAuth client, requested with different scopes.
  // Unset until Phase 1 (auth) / Phase 4 (email intake) wire them up.
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

export const config = parsed.data;
