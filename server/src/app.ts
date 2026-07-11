import fs from 'node:fs';
import path from 'node:path';
import * as Sentry from '@sentry/node';
import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import { auth } from './auth';
import { config } from './config';
import { prisma } from './db';
import { ticketsRouter } from './routes/tickets';
import { usersRouter } from './routes/users';
import { webhooksRouter } from './routes/webhooks';

// Built client assets live at ../../client/dist relative to this compiled file
// (server/dist/app.js -> repo root -> client/dist) in the deployed Docker image.
// Absent in dev/test, where the client is served separately by the Vite dev
// server, so this is skipped entirely there. This module compiles to
// CommonJS (no "type": "module" in server/package.json), so __dirname is a
// native global here.
const clientDistPath = path.resolve(__dirname, '../../client/dist');

export const app = express();

app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({ status: 'error' });
  }
});

app.use('/api/users', usersRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/webhooks', webhooksRouter);

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*splat', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

Sentry.setupExpressErrorHandler(app);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_server_error' });
});
