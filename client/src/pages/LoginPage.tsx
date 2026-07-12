import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '../lib/auth-client';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);

    const { error: signInError } = await authClient.signIn.email(values);

    if (signInError) {
      setFormError(signInError.message ?? 'Invalid email or password');
      return;
    }

    navigate('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Log in to HelpDesk</CardTitle>
          <CardDescription>Enter your email and password to continue</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </Button>
          </form>

          <div className="mt-6 rounded-md border bg-muted/50 p-3 text-sm">
            <p className="font-medium">Demo accounts</p>
            <p className="mt-2">
              <span className="text-muted-foreground">Admin:</span> admin@helpdesk.local
              <br />
              <span className="text-muted-foreground">Password:</span> Password123
            </p>
            <p className="mt-2">
              <span className="text-muted-foreground">Agent:</span> jane@helpdesk.com
              <br />
              <span className="text-muted-foreground">Password:</span> Password123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
