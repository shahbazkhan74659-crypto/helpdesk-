// One-off cleanup for the mis-dated Aug 1-11 2026 demo batch (superseded by
// seed-tickets.ts's relative date range). Deletes tickets in that window;
// TicketMessage rows cascade automatically (schema.prisma onDelete: Cascade).
import { prisma } from '../src/db';

async function main() {
  const result = await prisma.ticket.deleteMany({
    where: {
      createdAt: {
        gte: new Date('2026-08-01T00:00:00Z'),
        lt: new Date('2026-08-12T00:00:00Z'),
      },
    },
  });
  console.log(`Deleted ${result.count} tickets.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
