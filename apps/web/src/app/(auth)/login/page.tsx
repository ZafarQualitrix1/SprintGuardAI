'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '@sprintguard/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthSplitShell } from '@/components/auth/auth-split-shell';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { AppInput, AppPasswordInput } from '@/components/ui/login-1';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLogin } from '@/features/auth/api';
import { ApiError } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [googleError, setGoogleError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginInput) => {
    login.mutate(values, { onSuccess: () => router.push('/dashboard') });
  };

  return (
    <AuthSplitShell
      title="Sign in"
      subtitle="Enter your credentials to access your organization."
      footer={
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Don&apos;t have an account?{' '}
          <Link
            href={'/register' as never}
            className="text-[var(--color-heading)] underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <AppInput
          label="Email"
          type="email"
          placeholder="you@company.com"
          autoComplete="off"
          error={errors.email?.message}
          {...register('email')}
        />
        <AppPasswordInput
          label="Password"
          autoComplete="off"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end">
          <Link
            href={'/forgot-password' as never}
            className="text-sm text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        {login.isError ? (
          <p className="text-sm text-red-400">
            {login.error instanceof ApiError ? login.error.message : 'Unable to sign in.'}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className="my-4 flex items-center gap-3">
        <Separator className="flex-1 bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-text-secondary)]">OR</span>
        <Separator className="flex-1 bg-[var(--color-border)]" />
      </div>
      <GoogleSignInButton onSuccess={() => router.push('/dashboard')} onError={setGoogleError} />
      {googleError ? <p className="mt-2 text-center text-sm text-red-400">{googleError}</p> : null}
    </AuthSplitShell>
  );
}
