# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

HelpDesk is an AI-assisted ticket management system for a single educational institution: students email support, tickets get auto-classified/summarized/replied-to via Claude, and agents work exceptions in a queue. Full product scope is in `project-scope.md`, stack decisions in `tech-stack.md`, and phased build-out (with checkboxes for what's actually done) in `Implementation-plan.md` — check that file's checkboxes before assuming a feature (Gmail intake, AI classification, KB, dashboard, etc.) exists; most phases past Auth are not yet built.

## Commands

This is an npm workspaces monorepo (`client/`, `server/`, one root `node_modules`). Run `npm install` once at the repo root.

```bash
# Dev servers (run from repo root)
npm run dev:client     # Vite dev server, http://localhost:5173
npm run dev:server     # Express via tsx watch, http://localhost:3001

# Client (run from client/)
npm run build           # tsc && vite build
npm run lint             # eslint .

# Server (run from server/)
npm run build           # tsc -p tsconfig.json -> dist/
npm run lint             # eslint .
npm run seed             # tsx prisma/seed.ts — creates the admin user from ADMIN_EMAIL/ADMIN_PASSWORD

# Prisma (run from server/)
npx prisma migrate dev   # create/apply a migration
npx prisma generate      # regenerate the client into server/src/generated/prisma
```

There is no test suite yet in either workspace.

Both `client/.env` and `server/.env` are gitignored; copy from the corresponding `.env.example` when setting up. `server/.env` needs `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ chars, e.g. `openssl rand -base64 32`), `BETTER_AUTH_URL`, and `CLIENT_URL`; `GOOGLE_*` and `ANTHROPIC_API_KEY` are unused until Phases 4 and 6. `client/.env` needs `VITE_API_URL` pointing at the server.

## Architecture

**Auth is Better Auth, not a hand-rolled session system** (despite `tech-stack.md` describing `connect-pg-simple` — that was superseded). `server/src/auth.ts` configures `betterAuth` with the Prisma adapter, email/password enabled, and **signup disabled** (`disableSignUp: true`) — new users only ever come from `server/prisma/seed.ts` or future admin-invite endpoints, never self-registration. It's mounted in `server/src/index.ts` at `app.all('/api/auth/*splat', toNodeHandler(auth))`, ahead of `express.json()`. The client talks to it through `client/src/lib/auth-client.ts` (`createAuthClient` from `better-auth/react`), which pages consume via `authClient.signIn.email(...)`, `authClient.useSession()`, `authClient.signOut()`.

**Role handling is a deliberate hand-patch.** Better Auth generates the `User.role` field as a plain `String`; `server/prisma/schema.prisma` has been manually edited to make it a Postgres `Role` enum (`admin` | `agent`) for DB-level enforcement. Re-running Better Auth's schema generator will overwrite this back to `String` — reapply the enum after regenerating.

**Prisma client output is non-default**: generated into `server/src/generated/prisma` (see the `generator client` block in `schema.prisma`), imported from there in `server/src/db.ts`, not from `@prisma/client`. `db.ts` connects via `@prisma/adapter-pg` (`PrismaPg`) rather than Prisma's built-in driver.

**Server config is centralized and validated**: `server/src/config.ts` parses `process.env` through a single Zod schema and throws on startup if required vars are missing/invalid. Add new env vars there, not via scattered `process.env` reads.

**Client structure**: Vite + React 19 + React Router (routes in `client/src/App.tsx`; `Layout.tsx` provides the nav shell and wraps everything except `/login` in `<Outlet />`). Forms use `react-hook-form` + `@hookform/resolvers/zod` + `zod` (see `LoginPage.tsx` for the pattern: schema → `useForm` with `zodResolver` → `register`). Styling is Tailwind CSS v4 (`@import "tailwindcss"` in `client/src/index.css`, no separate Tailwind config file) plus shadcn UI on the "base" library variant (`@base-ui/react` primitives, not Radix) with the Nova preset — `components.json` records `style: base-nova`. The `@/*` import alias maps to `client/src/*`; it's declared in both `client/tsconfig.json` (`compilerOptions.paths`, no `baseUrl` — that option is deprecated in TS 6) and `client/vite.config.ts` (`resolve.alias`), and **both are required** — Vite's dev-server dependency scan does not resolve tsconfig `paths` on its own, only `tsc` and `vite build` do. Add new shadcn components with `npx shadcn@latest add <component>` from `client/`; note the registry's `form` item currently has no content for the base library, so forms are wired by hand with `Input`/`Label`/`Card`/`Button` + `react-hook-form`, not a `Form` wrapper.

Most page components (`DashboardPage`, `KnowledgeBasePage`, `TicketQueuePage`, `UsersPage`) are still placeholder stubs — only `LoginPage` and `Layout` have real implementations so far.
