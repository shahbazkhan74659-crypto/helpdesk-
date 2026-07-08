import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiPatch, apiPost } from '../lib/api';
import type { User } from './UsersTable';

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').min(3, 'Name must be at least 3 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .trim()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

const editUserSchema = createUserSchema.extend({
  password: z.string().trim().refine((value) => value.length === 0 || value.length >= 8, {
    message: 'Password must be at least 8 characters',
  }),
});

type UserFormValues = z.infer<typeof createUserSchema>;

type UserFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
};

function UserFormModal({ open, onOpenChange, user }: UserFormModalProps) {
  const isEditMode = !!user;
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(isEditMode ? editUserSchema : createUserSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (open) {
      reset(user ? { name: user.name, email: user.email, password: '' } : { name: '', email: '', password: '' });
    }
  }, [open, user, reset]);

  const mutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (isEditMode && user) {
        const payload: Partial<UserFormValues> = { name: values.name, email: values.email };
        if (values.password) {
          payload.password = values.password;
        }
        return apiPatch<{ user: User }>(`/api/users/${user.id}`, payload);
      }
      return apiPost<{ user: User }>('/api/users', values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      setFormError(null);
    }
    onOpenChange(next);
  }

  async function onSubmit(values: UserFormValues) {
    setFormError(null);

    try {
      await mutation.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setFormError('A user with this email already exists.');
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit user' : 'Create user'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update this user’s details.' : 'Add a new user to HelpDesk.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={isEditMode ? 'Leave blank to keep current password' : undefined}
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            {isEditMode && !errors.password && (
              <p className="text-sm text-muted-foreground">Leave blank to keep the current password.</p>
            )}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEditMode
                ? isSubmitting
                  ? 'Saving...'
                  : 'Save changes'
                : isSubmitting
                  ? 'Creating...'
                  : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default UserFormModal;
