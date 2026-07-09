/*
  Warnings:

  - The `category` column on the `tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('general_question', 'technical_question', 'refund_request');

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "category",
ADD COLUMN     "category" "TicketCategory";
