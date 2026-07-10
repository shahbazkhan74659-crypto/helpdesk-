import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './vitest.global-setup.ts',
    // Test files share one real, never-reset Postgres DB. Most routes are
    // isolated via a unique search suffix per test, but GET /api/tickets/stats
    // reads global aggregates with no such filter - running files in parallel
    // lets another file's concurrent ticket writes corrupt its baseline/delta
    // assertions, so files must run sequentially.
    fileParallelism: false,
  },
});
