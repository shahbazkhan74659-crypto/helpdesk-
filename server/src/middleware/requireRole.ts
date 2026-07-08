import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth';
import type { Role } from '../generated/prisma/client';

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

declare global {
  // Express type augmentation requires the `namespace` form; there's no ES module equivalent.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: NonNullable<Session>;
    }
  }
}

export const requireRole =
  (...roles: Array<Role>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });

    if (!session) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }

    if (!roles.includes(session.user.role)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    req.session = session;
    next();
  };
