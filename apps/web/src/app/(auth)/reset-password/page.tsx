'use client';

import { Suspense } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { resetPasswordSchema, type ResetPasswordInput } from '@sprintguard/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthSplitShell } from '@/components/auth/auth-split-shell';
import { AppPasswordInput } from '@/components/ui/login-1';
import { Button } from '@/components/ui/button';
import { useResetPassword } from '@/features/auth/api';
import { ApiError } from '@/lib/api-client';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = (values: ResetPasswordInput) => {
    resetPassword.mutate({ ...values, token }, { onSuccess: () => router.push('/dashboard') });
  };

  if (!token) {
    return (
      <p className="text-center text-sm text-destructive">
        This reset link is missing its token.{' '}
        <Link href={'/forgot-password' as never} className="underline-offset-4 hover:underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <AppPasswordInput
        label="New password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      {resetPassword.isError ? (
        <p className="text-sm text-red-400">
          {resetPassword.error instanceof ApiError ? resetPassword.error.message : 'Unable to reset your password.'}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
        {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthSplitShell
      title="Choose a new password"
      subtitle="You'll be signed in automatically once it's set."
      footer={
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Remembered your old one?{' '}
          <Link href={'/login' as never} className="text-[var(--color-heading)] underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthSplitShell>
  );
}
