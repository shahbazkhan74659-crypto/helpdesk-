import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
// Same pattern as agent-user.ts: created directly via Prisma against the
// isolated test DB since there's no ticket seed/fixture endpoint, scoped by
// DATABASE_URL from server/.env.test.
import { MessageSender, PrismaClient } from '../../server/src/generated/prisma/client';
import { DATABASE_URL } from './test-env';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

export type SeededTicket = {
  id: number;
  subject: string;
  studentEmail: string;
  originalMessageBody: string;
  replyBody?: string;
};

// Every ticket gets a unique subject/studentEmail/message body (via
// randomUUID) so parallel/repeated e2e runs never collide, mirroring
// server/src/routes/tickets.test.ts's use of crypto.randomUUID() suffixes -
// there's no per-test DB reset, only a one-time reset in globalSetup.
export async function createTicketWithMessages(options?: { withAgentReply?: boolean }): Promise<SeededTicket> {
  const suffix = randomUUID();
  const subject = `E2E Ticket ${suffix}`;
  const studentEmail = `student-${suffix}@test.local`;
  const originalMessageBody = `Original message body ${suffix}`;

  const ticket = await prisma.ticket.create({
    data: { subject, studentEmail },
  });

  await prisma.ticketMessage.create({
    data: { ticketId: ticket.id, sender: MessageSender.student, body: originalMessageBody, sentAt: new Date() },
  });

  let replyBody: string | undefined;
  if (options?.withAgentReply) {
    replyBody = `Pre-existing agent reply ${suffix}`;
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        sender: MessageSender.agent,
        body: replyBody,
        // Sequenced a second after the original message so ordering (the
        // GET route sorts by sentAt asc) isn't at the mercy of same-millisecond
        // timestamps between the two nested creates.
        sentAt: new Date(Date.now() + 1000),
      },
    });
  }

  return { id: ticket.id, subject, studentEmail, originalMessageBody, replyBody };
}
