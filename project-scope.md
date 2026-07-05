## Problem

Educational institutions receive hundreds of support emails from students daily. Agents manually read, classify, and respond to each ticket, which is slow and leads to impersonal, canned responses.

## Solution

Build a ticket management system that uses AI to automatically classify, respond to, and route student support tickets, delivering faster, more personalized responses while freeing up agents for complex issues.

## Audience & Scope

- **End users**: students at a single educational institution (not multi-tenant)
- **Intake channel**: email only for v1
- **Roles**:
  - **Admin**: manages users, settings, and the knowledge base
  - **Agent**: works the ticket queue day-to-day
- **Email provider**: Gmail / Google Workspace API, via push (webhook) notifications
- **Attachments**: supported on inbound emails

## Features

**Ticket intake & AI processing**
- Receive support emails via Gmail webhook (including attachments) and create tickets
- Classify tickets automatically using AI, including priority (Low/Med/High/Urgent)
- Generate AI summaries of tickets
- Generate human-friendly AI-suggested replies using a knowledge base authored in-app
- Auto-send AI replies by default; students can request a human agent at any time, which escalates the ticket out of auto-reply handling
- Certain fixed ticket categories (e.g. sensitive or high-stakes topics) always skip auto-send and route to a human, regardless of AI confidence
- Email students when their ticket status changes or a reply is sent

**Ticket management**
- Ticket list with filtering and sorting (including by priority)
- Ticket detail view
- Ticket status: Open, Resolved, Closed
- Dashboard showing ticket volume, AI resolution rate, average response time, and agent workload/queue depth

**Administration**
- User management (Admin and Agent roles)
- Knowledge base authoring (Admin)

## Open Questions

- **Escalation category list**: which specific ticket categories should be flagged as always-human (e.g. mental health, harassment, financial aid, grade disputes)?
- **AI confidence threshold**: for categories not on the always-human list, what confidence score is required before an AI reply auto-sends?
- **Attachment handling**: size/type limits, virus scanning, and storage location for inbound attachments?
- **Notification delivery**: same email thread as the ticket, or a separate notification email?

