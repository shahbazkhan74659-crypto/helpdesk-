import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '../lib/auth-client';

function RequireAuth({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return null;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default RequireAuth;
