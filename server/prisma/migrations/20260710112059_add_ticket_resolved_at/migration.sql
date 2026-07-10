-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- Best-effort approximation for tickets already resolved before this column existed.
UPDATE "tickets" SET "resolvedAt" = "updatedAt" WHERE "status" = 'resolved' AND "resolvedAt" IS NULL;
