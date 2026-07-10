import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { prisma } from '../db';
import { TicketCategory } from '../generated/prisma/client';
import { boss, CLASSIFY_TICKET_QUEUE } from './boss';

const CATEGORY_VALUES = Object.values(TicketCategory);

export type ClassifyTicketJob = {
  ticketId: number;
  subject: string;
  body: string;
};

export function registerClassifyTicketWorker(): Promise<string> {
  return boss.work<ClassifyTicketJob>(CLASSIFY_TICKET_QUEUE, async ([job]) => {
    const { ticketId, subject, body } = job.data;

    const { text } = await generateText({
      model: openai('gpt-5-nano'),
      system:
        'You classify student support tickets into exactly one category. ' +
        `Respond with only one of these exact words and nothing else: ${CATEGORY_VALUES.join(', ')}.`,
      prompt: `Ticket subject: ${subject}\nTicket message: ${body}`,
    });

    const category = CATEGORY_VALUES.find((value) => value === text.trim());
    if (!category) {
      // Throwing fails the job so pg-boss retries it with backoff, rather than
      // silently dropping a classification because the model returned junk.
      throw new Error(`Ticket classification returned unexpected value: "${text}"`);
    }

    await prisma.ticket.update({ where: { id: ticketId }, data: { category } });
  });
}
