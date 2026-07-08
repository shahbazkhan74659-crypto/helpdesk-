import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CreateUserModal from '../components/CreateUserModal';
import UsersTable, { type User } from '../components/UsersTable';
import { apiGet } from '../lib/api';

function UsersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
        <Button onClick={() => setIsCreateOpen(true)}>Create user</Button>
      </div>

      <CreateUserModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {isError && <p className="text-sm text-destructive">Failed to load users. Please try again.</p>}

      {(isPending || users) && <UsersTable users={users} isPending={isPending} />}
    </div>
  );
}

export default UsersPage;
