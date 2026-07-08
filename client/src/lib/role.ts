// Mirrors the shape of the server's Prisma-generated `Role` enum
// (server/src/generated/prisma/enums.ts) without importing it directly —
// the client intentionally stays decoupled from the server's generated
// Prisma client (see auth-client.ts's inferAdditionalFields usage).
export const Role = {
  admin: 'admin',
  agent: 'agent',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
