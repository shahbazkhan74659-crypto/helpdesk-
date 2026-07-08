-- CreateTable
CREATE TABLE "deleted_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deleted_users_pkey" PRIMARY KEY ("id")
);

-- Migrate any already-soft-deleted users (deletedAt IS NOT NULL) into the new
-- table before dropping the column, instead of silently discarding the flag.
INSERT INTO "deleted_users" ("id", "name", "email", "role", "createdAt", "deletedAt")
SELECT "id", "name", "email", "role", "createdAt", "deletedAt"
FROM "user"
WHERE "deletedAt" IS NOT NULL;

DELETE FROM "user" WHERE "deletedAt" IS NOT NULL;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "deletedAt";
