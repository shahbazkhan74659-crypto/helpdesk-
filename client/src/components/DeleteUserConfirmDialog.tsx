import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ApiError, apiDelete } from '../lib/api';
import type { User } from './UsersTable';

type DeleteUserConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
};

function DeleteUserConfirmDialog({ open, onOpenChange, user }: DeleteUserConfirmDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => apiDelete<{ success: boolean }>(`/api/users/${user!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleConfirm() {
    setError(null);

    try {
      await mutation.mutateAsync();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError('You can’t delete your own account.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            {user && (
              <>
                Are you sure you want to delete <strong>{user.name}</strong> ({user.email})? This can
                &rsquo;t be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={mutation.isPending} onClick={handleConfirm}>
            {mutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteUserConfirmDialog;
