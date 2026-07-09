# Implementation Plan

Stack assumptions (see `project-scope.md` for product scope):

- **Frontend**: React (SPA)
- **Backend**: Node.js / Express (REST API)
- **Database**: PostgreSQL
- **AI provider**: Anthropic Claude API
- **Auth**: Email/Password via Better Auth, database sessions (Admin/Agent sign-in)
- **Email**: Gmail API, webhook (push) ingestion, attachments supported

Phases are ordered so each one produces a working, demoable slice. Later phases depend on earlier ones.

---

## Phase 0 — Project Setup

- [x] Initialize monorepo structure (`client/`, `server/` as npm workspaces)
- [x] Set up Express project (TypeScript, linting, env config)
- [x] Set up React project (TypeScript, routing, base layout)
- [x] Set up PostgreSQL and its dependencies.
- [x] Set up Prisma and connect backend to DB.
- [x] Set up shared config for secrets (Google OAuth creds, Gmail API creds, Anthropic API key)
- [x] create .gitignore for the Secrets and Passwords
- [x] Commit in git

## Phase 1 — Auth & User Management

- [x] Set up Better Auth (email/password, database sessions) on the backend
- [ ] Add `role` field (Admin/Agent) to `users`, enforce role-based access on endpoints
- [ ] Admin endpoints: list users, invite/add user, set role, deactivate user
- [ ] Frontend: login page, protected routes, role-aware nav (Admin sees User Management, Agent doesn't)
- [ ] Admin UI: user management screen (list, invite, change role, deactivate)


## Phase 2 — Data Model & Core Ticket API

- [ ] Design DB schema: `users`, `tickets`, `ticket_messages`, `kb_articles`
  - `tickets`: status (Open/Resolved/Closed), priority (Low/Med/High/Urgent), category, created_at, student_email, assigned_agent_id
  - `ticket_messages`: ticket_id, sender (student/agent/ai), body, sent_at
- [ ] Write and run initial migration
- [ ] Build REST endpoints: create ticket, list tickets (with filter/sort params), get ticket detail, update ticket status
- [ ] Build endpoint to add a message to a ticket (manual agent reply, for now)
- [ ] Seed script with sample tickets for local dev/testing
- [ ] Backend tests for ticket CRUD endpoints

**Status note (2026-07-09):** `tickets`/`ticket_messages` Prisma models + migration (`add_tickets`) exist, sized for what email intake (Phase 4) needs to write to. `GET /api/tickets` (list, sorted newest-first) now exists (`server/src/routes/tickets.ts`) — `kb_articles`, create/detail/status-update endpoints, filter/sort params, the message-reply endpoint, seed script, and backend tests are still not built.

## Phase 3 — Core Frontend: Ticket Queue

- [ ] Ticket list view: table with filtering (status, priority, category) and sorting (date, priority)
- [ ] Ticket detail view: message thread, status, priority, category, assigned agent
- [ ] Agent actions on detail view: change status, reply manually, reassign
- [ ] Basic responsive layout / navigation shell (queue, dashboard, KB, users)
- [ ] Frontend tests for list/detail views (rendering, filter/sort behavior)

**Status note (2026-07-09):** A basic ticket list view exists at `/tickets` (`client/src/pages/TicketsPage.tsx` + `TicketsTable.tsx`), showing Subject/Requester/Status/Priority/Created, sorted newest-first — no filtering, no sort-by-priority, and no detail/agent-actions view yet.

At the end of Phase 3, the system is a working manual ticketing tool with no AI or email yet — a usable checkpoint.

## Phase 4 — Email Intake (Gmail)

- [ ] Set up Gmail API project, OAuth scopes for the support inbox
- [ ] Implement Gmail push notifications (Cloud Pub/Sub subscription → webhook endpoint)
- [ ] Webhook handler: fetch new message via Gmail API, parse sender/subject/body/attachments
- [ ] Map inbound email → new ticket or new message on existing ticket (thread matching via subject/Message-ID/References headers)
- [ ] Store attachments (choose storage: S3/GCS bucket or DB blob) and link to `ticket_messages`
- [ ] Handle outbound replies: sending agent/AI replies back through Gmail API on the same thread
- [ ] Error handling: malformed emails, duplicate delivery, webhook retries
- [ ] Integration test with a sandbox/test Gmail inbox

**Status note (2026-07-09):** A provider-agnostic `POST /api/webhooks/inbound-email` endpoint exists (`server/src/routes/webhooks.ts`) that accepts a normalized email payload and either creates a new ticket or threads a message onto an existing one (matching `In-Reply-To`/`References` against stored `Message-ID`s). No real provider is wired up yet — Gmail OAuth/Pub/Sub, attachment storage, and outbound replies are still unbuilt, and the Gmail-vs-SendGrid/Mailgun discrepancy between this doc and `tech-stack.md` is still unresolved. Whichever provider is chosen should call this same endpoint (or the logic behind it) rather than duplicating ticket-creation logic.

## Phase 5 — Knowledge Base

- [ ] `kb_articles` schema: title, body, tags/category, created_by, updated_at
- [ ] Backend endpoints: CRUD for KB articles (Admin-only write, readable internally)
- [ ] Admin UI: KB article list, create/edit/delete article
- [ ] Basic search/lookup over KB articles (keyword match to start; can upgrade to embeddings later)

## Phase 6 — AI Classification & Summarization

- [ ] Define ticket category taxonomy (with input from the always-escalate category list decision)
- [ ] Build Claude API integration layer (prompt templates, request/response handling, error/retry handling)
- [ ] Classification: on new ticket, call Claude to assign category + priority (Low/Med/High/Urgent)
- [ ] Summarization: generate a short AI summary of the ticket thread, store and display on detail view
- [ ] Store AI confidence score alongside classification for later use in auto-send logic
- [ ] Backend tests with mocked Claude responses
- [ ] Manual QA pass: run a batch of sample emails through classification, spot-check accuracy

## Phase 7 — AI-Suggested Replies & Auto-Send

- [ ] Build reply-generation prompt that pulls relevant KB articles into context (basic retrieval: keyword/tag match on category)
- [ ] Generate AI-suggested reply, store as a draft message linked to the ticket
- [ ] Escalation rule engine:
  - [ ] Always-human category list (from Phase 6 taxonomy) — skip auto-send, route to agent queue
  - [ ] Confidence threshold check for all other categories — below threshold routes to agent for review, above threshold auto-sends
- [ ] Auto-send path: send AI reply via Gmail API, mark ticket message as AI-sent
- [ ] Manual-review path: surface AI draft in agent queue with one-click send/edit-then-send
- [ ] "Request a human" handling: detect this in inbound student replies (keyword/intent check) and escalate, halting further auto-send on that ticket
- [ ] Tests for the escalation rule engine (category list, threshold boundary cases, human-request detection)

## Phase 8 — Notifications

- [ ] Notification triggers: ticket status change, new reply (AI or human) sent to student
- [ ] Decide delivery format implementation (reply-in-thread vs. separate notification email) per earlier decision
- [ ] Build notification sending via Gmail API (or transactional email service if separate from support inbox)
- [ ] Backend tests for notification triggers firing on the right events (and not double-firing)

## Phase 9 — Dashboard & Metrics

- [ ] Backend aggregation endpoints: ticket volume over time, AI resolution rate, average response time, agent workload/queue depth
- [ ] Dashboard UI: charts/tiles for each of the four metrics, date-range filter
- [ ] Performance check: ensure aggregation queries are indexed appropriately as ticket volume grows

## Phase 10 — Polish, Hardening, Deployment

- [ ] Attachment handling: size/type limits, virus scanning integration, storage lifecycle
- [ ] Access control audit: confirm Agent vs Admin permissions enforced on every endpoint
- [ ] Rate limiting / abuse protection on public-facing webhook endpoint
- [ ] Logging & error monitoring (backend errors, failed AI calls, failed email sends)
- [ ] Load-test ticket list/dashboard queries with realistic data volume
- [ ] End-to-end test: real email in → classified → AI reply auto-sent → status updates → dashboard reflects it
- [ ] Write deployment runbook, deploy to production environment
- [ ] Post-launch: define the exact always-escalate category list and confidence threshold with real usage data (from Open Questions in `project-scope.md`)

---

## Notes

- Phases 0–3 deliver a working manual ticketing system before any AI or email automation is introduced — useful as an early internal demo.
- Phases 6–7 depend on the KB (Phase 5) and the taxonomy/escalation decisions still open in `project-scope.md`; revisit those decisions before starting Phase 6.
- Attachment storage choice (Phase 4) and virus scanning (Phase 10) should be settled before real student emails are accepted in production.
