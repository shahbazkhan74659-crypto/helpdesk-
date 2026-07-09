import crypto from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../app';
import { auth } from '../auth';
import { Role } from '../generated/prisma/client';

const PASSWORD = 'password1234';

async function createUserAndSignIn(role: Role, name: string): Promise<string> {
  const email = `${role}-${crypto.randomUUID()}@example.com`;

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(PASSWORD);
  const user = await ctx.internalAdapter.createUser({ email, name, emailVerified: true, role });
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: hash,
  });

  const signInResponse = await request(app).post('/api/auth/sign-in/email').send({ email, password: PASSWORD });
  const cookie = signInResponse.headers['set-cookie'];
  if (!cookie) {
    throw new Error('sign-in did not return a session cookie');
  }
  return cookie;
}

describe('GET /api/users/agents', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await request(app).get('/api/users/agents');

    expect(response.status).toBe(401);
  });

  it('is reachable by an agent, unlike GET /api/users', async () => {
    const cookie = await createUserAndSignIn(Role.agent, 'Requesting Agent');

    const forbidden = await request(app).get('/api/users').set('Cookie', cookie);
    expect(forbidden.status).toBe(403);

    const response = await request(app).get('/api/users/agents').set('Cookie', cookie);
    expect(response.status).toBe(200);
  });

  it('returns only agents, not admins', async () => {
    const cookie = await createUserAndSignIn(Role.admin, 'Requesting Admin');
    const suffix = crypto.randomUUID();
    await createUserAndSignIn(Role.agent, `Findable Agent ${suffix}`);
    const adminName = `Other Admin ${suffix}`;
    await createUserAndSignIn(Role.admin, adminName);

    const response = await request(app).get('/api/users/agents').set('Cookie', cookie);

    expect(response.status).toBe(200);
    const names = response.body.agents.map((agent: { name: string }) => agent.name);
    expect(names).toContain(`Findable Agent ${suffix}`);
    expect(names).not.toContain(adminName);
  });
});
