import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { config } from '../config';
import { prisma } from '../db';
import { MessageSender } from '../generated/prisma/client';

export const webhooksRouter = Router();

const inboundEmailSchema = z.object({
  from: z.string().email().max(254),
  subject: z.string().max(998),
  body: z.string().max(100_000),
  messageId: z.string().min(1).max(998),
  inReplyTo: z.string().max(4000).optional(),
  references: z.string().max(4000).optional(),
});

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  return providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
}

// Ticket subject/body are stored and rendered as plain text (no rich-text
// feature exists), so strip all markup rather than allowing a "safe" subset -
// this also protects any future feature that renders these fields as HTML.
function sanitizePlainText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

webhooksRouter.post('/inbound-email', async (req, res) => {
  if (config.INBOUND_EMAIL_WEBHOOK_SECRET) {
    const secret = req.header('x-webhook-secret') ?? '';
    if (!secretsMatch(secret, config.INBOUND_EMAIL_WEBHOOK_SECRET)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
  }

  const parsed = inboundEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'invalid_request' });
    return;
  }

  const { from, messageId, inReplyTo, references } = parsed.data;
  const subject = sanitizePlainText(parsed.data.subject);
  const body = sanitizePlainText(parsed.data.body);

  // Provider redelivery of a Message-ID we've already stored - treat as a no-op
  // rather than hitting the unique constraint on TicketMessage.messageId.
  const existingMessage = await prisma.ticketMessage.findUnique({ where: { messageId } });
  if (existingMessage) {
    res.status(200).json({ ticketId: existingMessage.ticketId, isNewTicket: false });
    return;
  }

  const candidateMessageIds = `${inReplyTo ?? ''} ${references ?? ''}`.split(/\s+/).filter(Boolean);

  const matchedMessage = candidateMessageIds.length
    ? await prisma.ticketMessage.findFirst({
        where: { messageId: { in: candidateMessageIds } },
        select: { ticketId: true, ticket: { select: { studentEmail: true } } },
      })
    : null;

  // Only graft onto an existing thread if the sender matches the ticket's
  // student - otherwise an attacker who knows/guesses one Message-ID from a
  // thread could inject a message into someone else's ticket.
  if (matchedMessage && matchedMessage.ticket.studentEmail === from) {
    await prisma.ticketMessage.create({
      data: {
        ticketId: matchedMessage.ticketId,
        sender: MessageSender.student,
        body,
        messageId,
        inReplyTo,
      },
    });

    res.status(201).json({ ticketId: matchedMessage.ticketId, isNewTicket: false });
    return;
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      studentEmail: from,
      messages: {
        create: {
          sender: MessageSender.student,
          body,
          messageId,
          inReplyTo,
        },
      },
    },
  });

  res.status(201).json({ ticketId: ticket.id, isNewTicket: true });
});
