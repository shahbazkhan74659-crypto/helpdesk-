import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import { auth } from './auth';
import { config } from './config';
import { prisma } from './db';

const app = express();
const port = config.PORT;

app.use(cors());
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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
