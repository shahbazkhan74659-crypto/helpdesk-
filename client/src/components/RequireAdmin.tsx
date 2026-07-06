import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '../lib/auth-client';

function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return null;
  }

  if (session?.user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default RequireAdmin;
