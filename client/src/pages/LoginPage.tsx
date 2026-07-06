import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-gray-900">Log in to HelpDesk</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className={`rounded border px-3 py-2 text-sm focus:outline-none ${
                errors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-gray-500'
              }`}
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className={`rounded border px-3 py-2 text-sm focus:outline-none ${
                errors.password
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-gray-500'
              }`}
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
