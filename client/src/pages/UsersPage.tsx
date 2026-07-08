import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import DeleteUserConfirmDialog from '../components/DeleteUserConfirmDialog';
import UserFormModal from '../components/UserFormModal';
import UsersTable, { type User } from '../components/UsersTable';
import { apiGet } from '../lib/api';

type ModalState = { mode: 'create' } | { mode: 'edit'; user: User } | null;

function UsersPage() {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const {
    data: users,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiGet<{ users: User[] }>('/api/users').then((data) => data.users),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Users</h1>
        <Button onClick={() => setModalState({ mode: 'create' })}>Create user</Button>
      </div>

      <UserFormModal
        open={modalState !== null}
        onOpenChange={(open) => {
          if (!open) setModalState(null);
        }}
        user={modalState?.mode === 'edit' ? modalState.user : undefined}
      />

      <DeleteUserConfirmDialog
        open={deletingUser !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
        user={deletingUser}
      />

      {isError && <p className="text-sm text-destructive">Failed to load users. Please try again.</p>}

      {(isPending || users) && (
        <UsersTable
          users={users}
          isPending={isPending}
          onEdit={(user) => setModalState({ mode: 'edit', user })}
          onDelete={(user) => setDeletingUser(user)}
        />
      )}
    </div>
  );
}

export default UsersPage;
