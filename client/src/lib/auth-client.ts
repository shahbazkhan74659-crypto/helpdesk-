import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { Role } from './role';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: [Role.admin, Role.agent],
        },
      },
    }),
  ],
});
