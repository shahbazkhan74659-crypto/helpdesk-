import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import { auth } from './auth';
import { config } from './config';
import { prisma } from './db';
import { usersRouter } from './routes/users';
import { webhooksRouter } from './routes/webhooks';

const app = express();
const port = config.PORT;

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
app.use('/api/webhooks', webhooksRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_server_error' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
