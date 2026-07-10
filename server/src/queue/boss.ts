import { PgBoss } from 'pg-boss';
import { config } from '../config';

export const CLASSIFY_TICKET_QUEUE = 'classify-ticket';

export const boss = new PgBoss(config.DATABASE_URL);

boss.on('error', (error) => console.error('pg-boss error:', error));

let startPromise: Promise<PgBoss> | null = null;

// Idempotent/cached so both index.ts (real server startup) and webhooks.ts
// (enqueueing from a request, and the test suite driving `app` directly
// without index.ts ever running) can call this safely without double-starting.
export function startBoss(): Promise<PgBoss> {
  if (!startPromise) {
    startPromise = boss.start().then(async (started) => {
      await boss.createQueue(CLASSIFY_TICKET_QUEUE);
      return started;
    });
  }
  return startPromise;
}
