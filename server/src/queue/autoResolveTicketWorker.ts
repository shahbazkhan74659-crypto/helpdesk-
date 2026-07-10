import fs from 'node:fs';
import path from 'node:path';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '../db';
import { MessageSender, TicketStatus } from '../generated/prisma/client';
import { AUTO_RESOLVE_TICKET_QUEUE, boss } from './boss';

// Both src/queue/*.ts (tsx dev) and dist/queue/*.js (compiled) sit one level
// deeper than server/, so this resolves to server/knowledge-base.md either way.
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../../knowledge-base.md');

const resolutionSchema = z.object({
  decision: z.enum(['resolve', 'escalate']),
  reply: z.string().nullable(),
});

export type AutoResolveTicketJob = {
  ticketId: number;
  subject: string;
  body: string;
};

export function registerAutoResolveTicketWorker(): Promise<string> {
  return boss.work<AutoResolveTicketJob>(AUTO_RESOLVE_TICKET_QUEUE, async ([job]) => {
    const { ticketId, subject, body } = job.data;
    const knowledgeBase = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf-8');

    const { object } = await generateObject({
      model: openai('gpt-5-nano'),
      schema: resolutionSchema,
      system:
        'You are an AI support assistant answering student support tickets using only the knowledge base below. ' +
        "Follow the Escalation Rules section exactly: if the ticket matches any escalation rule, or you're not " +
        'confident the knowledge base fully answers it, set decision to "escalate" and leave reply null - a ' +
        'human agent will handle it. Otherwise set decision to "resolve" and write a complete, friendly reply ' +
        "to send directly to the student, based only on the knowledge base. Never invent policy that isn't in it.\n\n" +
        `Knowledge base:\n${knowledgeBase}`,
      prompt: `Ticket subject: ${subject}\nTicket message: ${body}`,
    });

    if (object.decision !== 'resolve' || !object.reply) {
      return;
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.resolved,
        resolvedByAi: true,
        messages: {
          create: { sender: MessageSender.ai, body: object.reply },
        },
      },
    });
  });
}
