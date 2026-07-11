# Deploying to Railway

Single-service deployment: one Railway service builds and runs `Dockerfile` at
the repo root, which builds both the Vite client and the Express server, then
runs the server. The server serves the built client as static files (with SPA
fallback) alongside the `/api/*` routes and pg-boss job workers, all in one
process - see `server/src/app.ts` and `server/src/index.ts`. No CORS/cross-site
cookie setup needed since everything is served from one origin.

`railway.json` at the repo root already points Railway at the Dockerfile and
sets the healthcheck path (`/health`), so creating the service from this repo
should need no extra build configuration.

## 1. Create the project

1. In Railway, **New Project → Deploy from GitHub repo**, pick this repo.
2. **Add a database → PostgreSQL** (a plugin in the same project). Railway
   provisions it and exposes its connection variables automatically.
3. On the app service, go to **Variables** and add a reference to the
   database: `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (use Railway's
   variable-reference picker, not the literal string).
4. Under the app service's **Settings → Networking**, click **Generate
   Domain** to get a public URL (e.g. `https://helpdesk-production.up.railway.app`).

## 2. Set environment variables

On the app service, set (see `server/.env.example` for descriptions):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (step 1) |
| `CLIENT_URL` | The public domain from step 1, e.g. `https://helpdesk-production.up.railway.app` |
| `BETTER_AUTH_URL` | Same value as `CLIENT_URL` |
| `BETTER_AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | Any random string - required in production (`server/src/config.ts`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Only needed if you run the seed script (step 4) |

Optional, add when the relevant feature is used:
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` (email intake),
`ANTHROPIC_API_KEY` (AI classification/summaries), `OPENAI_API_KEY` (reply
"Polish" button), `SENTRY_DSN` / `SENTRY_ENVIRONMENT` (server error reporting).

**Do not set `VITE_API_URL`.** Leave it unset - the client then calls the API
via a relative path, which resolves to the same origin it's served from
(`client/src/lib/api.ts`). Setting it would point the client at the wrong
host. `VITE_SENTRY_DSN` / `VITE_SENTRY_ENVIRONMENT` are optional client-side
Sentry vars, passed as Docker build args if you want them (see `Dockerfile`);
set them as build-time variables on the service, not runtime ones, since Vite
inlines them at build.

## 3. Deploy

Push to the branch Railway is watching (or trigger a manual deploy). The
Dockerfile's final `CMD` runs `npx prisma migrate deploy` before starting the
server, so schema migrations apply automatically on every deploy - no
separate release step needed.

Confirm it's healthy: `https://<your-domain>/health` should return
`{"status":"ok"}`, and `/health/db` confirms the database connection.

## 4. Create the first admin user

The app has no self-service signup (`disableSignUp: true` in
`server/src/auth.ts`) - the only way to create a user is `server/prisma/seed.ts`,
which needs `ADMIN_EMAIL`/`ADMIN_PASSWORD` set (step 2). Run it once against
the deployed service with the [Railway CLI](https://docs.railway.com/guides/cli):

```bash
railway link          # select this project
railway run --service <app-service-name> npm run seed --workspace server
```

## Building/testing the image locally

Requires Docker running locally:

```bash
docker build -t helpdesk-app .
docker run --rm -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:password@host.docker.internal:5432/helpdesk" \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -e BETTER_AUTH_URL="http://localhost:3001" \
  -e CLIENT_URL="http://localhost:3001" \
  -e INBOUND_EMAIL_WEBHOOK_SECRET="local-test-secret" \
  -e NODE_ENV="production" \
  helpdesk-app
```

Then visit `http://localhost:3001` - the server serves both the app and the
API. `/health` should return `{"status":"ok"}`.
