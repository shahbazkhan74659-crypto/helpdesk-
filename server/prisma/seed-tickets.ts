// Generates demo ticket data spread across the last 11 days for exercising
// the dashboard/queue UI with realistic volume. The range is relative to
// "now" (not a fixed calendar range) since GET /api/tickets/stats/daily
// (server/src/routes/tickets.ts) only ever shows a trailing 30-day window
// ending today - a fixed past/future date range would eventually (or
// immediately) fall outside what the chart can display. Not idempotent -
// each run adds another batch of tickets. Not part of `npm run seed` (which
// only seeds the essential admin/AI-agent users); run explicitly with
// `npm run seed:tickets`.
import { MessageSender, TicketCategory, TicketPriority, TicketStatus } from '../src/generated/prisma/client';
import { AI_AGENT_EMAIL } from '../src/constants';
import { prisma } from '../src/db';

const TICKET_COUNT = 110;
const RANGE_DAYS = 11;
const RANGE_END = new Date();
const RANGE_START = new Date(RANGE_END.getTime() - (RANGE_DAYS - 1) * 24 * 60 * 60 * 1000);

const SUBJECTS: Record<TicketCategory, string[]> = {
  [TicketCategory.general_question]: [
    'How do I reset my student portal password?',
    'Where can I find my class schedule?',
    'How do I apply for financial aid?',
    'What are the registrar office hours?',
    'How do I request an official transcript?',
    'Can I get an extension on my assignment deadline?',
    'How do I enroll in the student health insurance plan?',
    'Where is the campus IT help desk located?',
    'How do I change my declared major?',
    'What is the deadline to drop a course this semester?',
  ],
  [TicketCategory.technical_question]: [
    'Unable to log into the campus WiFi network',
    'Course registration system is showing an error',
    "Can't access my student email account",
    "The library's online catalog isn't loading",
    "My student ID card isn't scanning at the dining hall",
    "Zoom link for online class isn't working",
    'Unable to upload assignment to the LMS',
    'Printer in the library is not working',
    'Two-factor authentication code never arrives',
    'Course materials page returns a 404 error',
  ],
  [TicketCategory.refund_request]: [
    'Requesting refund for a dropped course',
    'Parking permit refund request',
    'Meal plan refund after withdrawal',
    'Overcharged for lab fees, need refund',
    'Refund for duplicate tuition payment',
    'Housing deposit refund request',
  ],
};

const MESSAGE_BODIES: Record<TicketCategory, string> = {
  [TicketCategory.general_question]:
    "Hi, I couldn't find this in the student handbook - could someone point me in the right direction? Thanks!",
  [TicketCategory.technical_question]:
    "I've tried restarting and clearing my browser cache but the issue is still happening. Can someone take a look?",
  [TicketCategory.refund_request]:
    'I was charged for this and believe I am owed a refund. Please let me know what information you need from me to process this.',
};

const RESOLUTION_REPLIES = [
  "This has been resolved - let us know if you run into any further issues.",
  'Fixed on our end. Please try again and reach back out if the problem persists.',
  "Thanks for your patience - I've taken care of this for you.",
];

const CATEGORIES = Object.values(TicketCategory);
const STATUSES = Object.values(TicketStatus);
const PRIORITIES = Object.values(TicketPriority);

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDateInRange(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Roughly: 45% open, 40% resolved, 15% closed.
function randomStatus(): TicketStatus {
  const roll = Math.random();
  if (roll < 0.45) return TicketStatus.open;
  if (roll < 0.85) return TicketStatus.resolved;
  return TicketStatus.closed;
}

// Roughly: 40% low, 35% medium, 18% high, 7% urgent.
function randomPriority(): TicketPriority {
  const roll = Math.random();
  if (roll < 0.4) return TicketPriority.low;
  if (roll < 0.75) return TicketPriority.medium;
  if (roll < 0.93) return TicketPriority.high;
  return TicketPriority.urgent;
}

async function main() {
  const aiAgent = await prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL }, select: { id: true } });
  if (!aiAgent) {
    throw new Error('AI agent user not found - run `npm run seed` first to create the base users.');
  }

  let created = 0;

  for (let i = 0; i < TICKET_COUNT; i++) {
    // ~15% of tickets are uncategorized, matching real-world data where
    // classification hasn't run (or failed) for some tickets.
    const category = Math.random() < 0.15 ? null : randomItem(CATEGORIES);
    const subject = category ? randomItem(SUBJECTS[category]) : randomItem(Object.values(SUBJECTS).flat());
    const status = randomStatus();
    const createdAt = randomDateInRange(RANGE_START, RANGE_END);

    const isResolved = status === TicketStatus.resolved;
    const resolvedByAi = isResolved && Math.random() < 0.5;
    // Resolution/close happens some time after creation, same day or the next.
    const resolvedAt = isResolved
      ? new Date(createdAt.getTime() + Math.random() * 1000 * 60 * 60 * 36)
      : null;
    const updatedAt = resolvedAt ?? createdAt;

    // ~55% assigned to the AI agent (mirrors the real auto-resolve flow
    // assigning incoming tickets to it), the rest unassigned.
    const assignedAgentId = Math.random() < 0.55 ? aiAgent.id : null;

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        status,
        priority: randomPriority(),
        category,
        studentEmail: `student${Math.floor(Math.random() * 60) + 1}@university.edu`,
        assignedAgentId,
        resolvedByAi,
        resolvedAt,
        createdAt,
        updatedAt,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        sender: MessageSender.student,
        body: category ? MESSAGE_BODIES[category] : 'Hi, I need some help with this - thanks!',
        sentAt: createdAt,
      },
    });

    if (status !== TicketStatus.open) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          sender: resolvedByAi ? MessageSender.ai : MessageSender.agent,
          body: randomItem(RESOLUTION_REPLIES),
          sentAt: resolvedAt ?? createdAt,
        },
      });
    }

    created++;
  }

  console.log(`Created ${created} demo tickets between ${RANGE_START.toISOString()} and ${RANGE_END.toISOString()}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
