## Project Structure

- Single repo, npm workspaces: one root `package.json`, `client/` and `server/` as workspace packages, one shared `node_modules`
- No monorepo tooling beyond npm workspaces (no Turborepo/Nx) - not needed at two packages

## Frontend

- React + TypeScript
- Tailwind CSS
- React Router

## Backend

- Express + TypeScript
- Authentication: session-based, sessions stored in the database (e.g. `connect-pg-simple` as the session store)

## Database

- PostgreSQL
- ORM: Prisma

## Email

- SendGrid or Mailgun (exact provider TBD) - inbound parse webhook turns incoming email into tickets; same provider sends outbound replies

## AI

- Claude API (Anthropic) for ticket classification, summarization, and reply generation
- Knowledge base retrieval: pgvector extension in PostgreSQL for embeddings/vector search - avoids standing up a separate vector database
- Embeddings: Voyage AI (or equivalent)

## Background Processing

- Async pipeline for incoming email -> classify -> generate reply -> send, so it doesn't block a web request
- Options: `pg-boss` (Postgres-backed, no extra infra) or Inngest/Trigger.dev (managed job orchestration)

## Hosting

- Frontend: Vercel or Netlify
- Backend: Railway, Render, or Fly.io
- Database: Neon, Supabase, or Railway Postgres (must support the pgvector extension)
