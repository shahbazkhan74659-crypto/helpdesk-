# HelpDesk

An AI-assisted ticket management system for a single educational institution: students email support, tickets get auto-classified/summarized/replied-to via Claude, and agents work exceptions in a queue.

## Problem

Educational institutions receive hundreds of support emails from students daily. Agents manually read, classify, and respond to each ticket — slow, and prone to impersonal, canned responses.

## What this aims to do

- Receive support emails and turn them into tickets (Gmail intake).
- Auto-classify and summarize tickets via Claude; auto-generate replies grounded in a knowledge base.
- Auto-send AI replies by default; escalate to a human agent on request or by category/confidence rules.
- Ticket queue with filtering/sorting, thread view, status/priority/category tracking.
- Admin and Agent roles, with role-gated routes and user management.
- A dashboard with ticket volume, AI resolution rate, and response-time metrics.

Single institution, not multi-tenant. See `project-scope.md` for the full product scope and open questions, and `tech-stack.md` for stack decisions.

## Current status

Substantially further along than a first read of `Implementation-plan.md`'s checkboxes suggests — check the actual code/git history over that doc's checkboxes, which lag real progress. Built and working:

- **Auth** — Better Auth (email/password, database-backed sessions), no self-service signup; users are created via a seed script or admin action only. Role-based access (Admin/Agent) enforced server-side, with a role-aware nav and an admin-only Users page client-side.
- **Ticket data model & API** — tickets with status/priority/category, message threads, CRUD/list/filter/sort endpoints.
- **Core frontend** — ticket queue and detail views, users management page.
- **Inbound email** — a webhook-based intake path with thread matching and idempotent redelivery handling.
- **AI classification** — tickets can be auto-classified.
- **Auto-resolve** — tickets can be automatically resolved.
- **Background jobs** — pg-boss wired in for async processing.
- **Dashboard** — a bar chart / metrics view.
- **Error monitoring** — Sentry integrated (server-side, with optional client-side DSN).
- **Testing** — Vitest component tests (client), Vitest + supertest route tests (server), Playwright e2e for auth/role/navigation flows that genuinely need a real browser session.
- **Deployment** — a single-service Docker build (client + server + pg-boss workers in one process), documented for Railway in `DEPLOY.md`, with Postgres migrations applied automatically on deploy.
- **Demo/seed data** — a ticket seed script and a cleanup script for stale demo batches; the login page shows demo credentials.

**Not yet built:** the knowledge base itself (KB article CRUD + retrieval), reply generation grounded in KB content, notifications on ticket status change, and a few Phase 10 hardening items (attachment size/type limits, rate limiting on the public webhook, a full access-control audit).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS v4, shadcn UI (base/Nova), `react-hook-form` + Zod |
| Backend | Express + TypeScript, run via `tsx` in dev |
| Database | PostgreSQL + Prisma ORM (custom client output path, `@prisma/adapter-pg`) |
| Auth | Better Auth (email/password, Postgres-backed sessions, signup disabled) |
| Background jobs | pg-boss |
| AI | Claude API (classification/summarization); OpenAI for a reply "Polish" feature |
| Error monitoring | Sentry (server and optionally client) |
| Testing | Vitest + React Testing Library (client), Vitest + supertest (server), Playwright (e2e) |
| Deployment | Docker (single image, single Railway service), migrations applied on deploy |

## Project structure

```
client/     React + TypeScript app (Vite) — pages, components, TanStack Query hooks
server/     Express + TypeScript API — routes, auth, Prisma schema/client, pg-boss queue
e2e/        Playwright end-to-end specs (login, role-based access, users table)
Dockerfile  Single-image build: client + server, run as one process
```

## Getting started

**Prerequisites:** Node.js, PostgreSQL.

```bash
npm install   # once, at the repo root — npm workspaces (client/, server/)

# Configure environment
cp client/.env.example client/.env   # VITE_API_URL
cp server/.env.example server/.env   # DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, CLIENT_URL

# Database
cd server
npx prisma migrate dev
npm run seed        # creates the admin user from ADMIN_EMAIL/ADMIN_PASSWORD

# Run both dev servers from the repo root, in separate terminals
npm run dev:client   # http://localhost:5173
npm run dev:server   # http://localhost:3001
```

### Testing

```bash
# Client component tests (from client/)
npm run test

# Server route tests (from server/)
npm run test

# End-to-end (from repo root)
npm run test:e2e
```

## Deployment

See `DEPLOY.md` for the full Railway deployment guide (single Docker image, Postgres plugin, environment variables, and creating the first admin user).

## Documentation

| File | Covers |
|---|---|
| `project-scope.md` | Problem, solution, audience/scope, feature list, open product questions |
| `tech-stack.md` | Stack decisions (note: predates the Better Auth switch — see `CLAUDE.md` for what's current) |
| `Implementation-plan.md` | Phased build order — checkboxes lag real progress; verify against the code |
| `DEPLOY.md` | Railway deployment guide |

## License

All rights reserved — see [`LICENSE`](LICENSE). This is not open-source software.
