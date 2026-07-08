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
npm run test             # vitest run — component tests
npm run test:watch       # vitest — watch mode, reruns on save
npm run test:ui          # vitest --ui — browser-based test explorer

# Server (run from server/)
npm run build           # tsc -p tsconfig.json -> dist/
npm run lint             # eslint .
npm run seed             # tsx prisma/seed.ts — creates the admin user from ADMIN_EMAIL/ADMIN_PASSWORD

# Prisma (run from server/)
npx prisma migrate dev   # create/apply a migration
npx prisma generate      # regenerate the client into server/src/generated/prisma

# Playwright e2e (run from repo root)
npm run test:e2e          # playwright test
npm run test:e2e:ui       # playwright test --ui
```

**Client-only component tests use Vitest + React Testing Library.** Setup lives in `client/vite.config.ts`'s `test` block (`environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`) and `client/src/test/setup.ts` (extends `expect` with `@testing-library/jest-dom/vitest`, and calls RTL's `cleanup()` in `afterEach` since `test.globals` is off — **imports in spec files must be explicit**, e.g. `import { describe, it, expect, vi } from 'vitest'`, not ambient globals; skipping the `cleanup()` call or the explicit imports is the most common way these tests break).

To write a component test: colocate it next to the component as `Component.test.tsx` (e.g. `client/src/pages/UsersPage.test.tsx`). If the component calls a custom endpoint via `apiGet`/`api.ts`, mock the module before rendering — `vi.mock('../lib/api', () => ({ apiGet: vi.fn() }))`, then get a typed handle with `const mockedApiGet = vi.mocked(apiGet)` and set its behavior per test (`mockReturnValue(new Promise(() => {}))` to freeze on the loading state, `mockResolvedValue(...)` for success, `mockRejectedValue(...)` for the error path) — reset it in a `beforeEach` so tests don't leak mock state into each other. If the component uses `useQuery`/`useMutation` (i.e. is inside `QueryClientProvider` in the real app), render it with `renderWithQuery` from `client/src/test/renderWithQuery.tsx` instead of RTL's bare `render` — it wraps the element in a fresh `QueryClient`/`QueryClientProvider` (with retries off) so each test starts with an empty cache; don't hand-roll another `QueryClientProvider` wrapper per test file. `UsersPage.test.tsx` is the reference for all of this: pending/skeleton state, success state (asserting on rendered data plus implementation details like the admin-role badge's class), and the error state.

To run them: `npm run test` (single run, what CI/verification should use), `npm run test:watch` (reruns on save while you're actively writing a test), `npm run test:ui` (opens a browser UI at the printed `localhost` URL for inspecting individual test results/DOM snapshots — useful when a failure's terminal output isn't enough to see what rendered).

The server workspace has no unit test suite. Playwright is configured for e2e (`playwright.config.ts` at repo root, `e2e/` dir, isolated `helpdesk_test` DB) with specs already covering login, role-based route access, and the users table. **Use the `e2e-tester` agent (`.claude/agents/e2e-tester.md`) to write or update any Playwright spec** — it already knows the isolated test-DB setup, seeded-admin caveats, and locator/assertion conventions, so don't hand-write `e2e/*.spec.ts` files directly.

Both `client/.env` and `server/.env` are gitignored; copy from the corresponding `.env.example` when setting up. `server/.env` needs `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ chars, e.g. `openssl rand -base64 32`), `BETTER_AUTH_URL`, and `CLIENT_URL`; `GOOGLE_*` and `ANTHROPIC_API_KEY` are unused until Phases 4 and 6. `client/.env` needs `VITE_API_URL` pointing at the server.

## Architecture

**Auth is Better Auth, not a hand-rolled session system** (despite `tech-stack.md` describing `connect-pg-simple` — that was superseded). `server/src/auth.ts` configures `betterAuth` with the Prisma adapter, email/password enabled, and **signup disabled** (`disableSignUp: true`) — new users only ever come from `server/prisma/seed.ts` or future admin-invite endpoints, never self-registration. It's mounted in `server/src/index.ts` at `app.all('/api/auth/*splat', toNodeHandler(auth))`, ahead of `express.json()`. The client talks to it through `client/src/lib/auth-client.ts` (`createAuthClient` from `better-auth/react`), which pages consume via `authClient.signIn.email(...)`, `authClient.useSession()`, `authClient.signOut()`. `auth-client.ts` also registers the `inferAdditionalFields` plugin so `session.user.role` is typed as `'admin' | 'agent'` — it's passed a standalone schema literal (just the `role` field shape) rather than `typeof auth` imported from the server, specifically to avoid coupling the client's typecheck/build to the server's generated Prisma client.

**Role handling is a deliberate hand-patch.** Better Auth generates the `User.role` field as a plain `String`; `server/prisma/schema.prisma` has been manually edited to make it a Postgres `Role` enum (`admin` | `agent`) for DB-level enforcement. Re-running Better Auth's schema generator will overwrite this back to `String` — reapply the enum after regenerating.

**Prisma client output is non-default**: generated into `server/src/generated/prisma` (see the `generator client` block in `schema.prisma`), imported from there in `server/src/db.ts`, not from `@prisma/client`. `db.ts` connects via `@prisma/adapter-pg` (`PrismaPg`) rather than Prisma's built-in driver.

**Server config is centralized and validated**: `server/src/config.ts` parses `process.env` through a single Zod schema and throws on startup if required vars are missing/invalid. Add new env vars there, not via scattered `process.env` reads.

**Client structure**: Vite + React 19 + React Router (routes in `client/src/App.tsx`; `Layout.tsx` provides the nav shell and wraps everything except `/login` in `<Outlet />`). The route tree is currently just `/login` (`LoginPage`), index `/` (`HomePage`), and `/users` (`UsersPage`, gated by `RequireAdmin`) — the earlier `DashboardPage`/`KnowledgeBasePage`/`TicketQueuePage` placeholders were removed and haven't been rebuilt yet, so most of the nav is intentionally gone for now. `client/src/components/RequireAdmin.tsx` is the role-gate pattern: it reads `authClient.useSession()` and redirects to `/` unless `session.user.role === 'admin'`; wrap any future admin-only route's element in it the same way `/users` is wrapped. `Layout.tsx`'s nav renders a "Home" link (`/`) for every signed-in user and a "Users" link only when `session.user.role === 'admin'`. Forms use `react-hook-form` + `@hookform/resolvers/zod` + `zod` (see `LoginPage.tsx` for the pattern: schema → `useForm` with `zodResolver` → `register`). Styling is Tailwind CSS v4 (`@import "tailwindcss"` in `client/src/index.css`, no separate Tailwind config file) plus shadcn UI on the "base" library variant (`@base-ui/react` primitives, not Radix) with the Nova preset — `components.json` records `style: base-nova`. The `@/*` import alias maps to `client/src/*`; it's declared in both `client/tsconfig.json` (`compilerOptions.paths`, no `baseUrl` — that option is deprecated in TS 6) and `client/vite.config.ts` (`resolve.alias`), and **both are required** — Vite's dev-server dependency scan does not resolve tsconfig `paths` on its own, only `tsc` and `vite build` do. Add new shadcn components with `npx shadcn@latest add <component>` from `client/`; note the registry's `form` item currently has no content for the base library, so forms are wired by hand with `Input`/`Label`/`Card`/`Button` + `react-hook-form`, not a `Form` wrapper.

**Server-state data fetching is TanStack Query, not raw `useEffect`/`useState`.** `client/src/main.tsx` creates one `QueryClient` and wraps `<App />` in `<QueryClientProvider>`. Custom (non-Better-Auth) server calls go through `apiGet<T>(path)` in `client/src/lib/api.ts` — a small wrapper around `fetch` that prefixes `VITE_API_URL` and sets `credentials: 'include'` so the Better Auth session cookie rides along, and throws `ApiError` (with `.status`) on a non-2xx response. Pages consume it with `useQuery({ queryKey: [...], queryFn: () => apiGet<T>('/api/...') })` — see `UsersPage.tsx` for the reference pattern (`queryKey: ['users']`, destructuring `data`/`isPending`/`isError`). Don't add a second fetch wrapper or reach for raw `useEffect` for server data — extend `api.ts` with a POST/PATCH helper the same way if a future endpoint needs one.

Most page components (`HomePage`) are still placeholder stubs (just a heading) — `LoginPage`, `Layout`, `RequireAdmin`, and `UsersPage` have real implementations.

## Auth notes

Better Auth's rate limiting (`server/src/auth.ts`) is explicitly gated on `config.NODE_ENV === 'production'` — it's off in dev/test so local iteration and e2e runs aren't throttled.
