// Mirrors the shape of the server's Prisma-generated `TicketStatus`/`TicketPriority`/
// `TicketCategory` enums (server/prisma/schema.prisma) without importing them
// directly — same reasoning as client/src/lib/role.ts's decoupling from the
// server's generated Prisma client.
export const TicketStatus = {
  open: 'open',
  resolved: 'resolved',
  closed: 'closed',
} as const;

export type TicketStatus = 'open' | 'resolved' | 'closed';

export const TicketPriority = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
} as const;

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export const TicketCategory = {
  general_question: 'general_question',
  technical_question: 'technical_question',
  refund_request: 'refund_request',
} as const;

export type TicketCategory = 'general_question' | 'technical_question' | 'refund_request';
