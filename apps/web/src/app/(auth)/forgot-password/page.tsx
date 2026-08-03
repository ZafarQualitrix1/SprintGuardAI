'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@sprintguard/shared';
import Link from 'next/link';
import { AuthSplitShell } from '@/components/auth/auth-split-shell';
import { AppInput } from '@/components/ui/login-1';
import { Button } from '@/components/ui/button';
import { useForgotPassword } from '@/features/auth/api';
import { ApiError } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = (values: ForgotPasswordInput) => {
    forgotPassword.mutate(values, { onSuccess: () => setSubmitted(true) });
  };

  return (
    <AuthSplitShell
      title="Reset password"
      subtitle="Enter your email and we'll send you a link to reset your password."
      footer={
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Remembered it?{' '}
          <Link href={'/login' as never} className="text-[var(--color-heading)] underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      {submitted ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          If an account exists for that email, we&apos;ve sent a link to reset your password. It expires in 60
          minutes.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
          <AppInput
            label="Email"
            type="email"
            placeholder="you@company.com"
            autoComplete="off"
            error={errors.email?.message}
            {...register('email')}
          />
          {forgotPassword.isError ? (
            <p className="text-sm text-red-400">
              {forgotPassword.error instanceof ApiError ? forgotPassword.error.message : 'Something went wrong.'}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthSplitShell>
  );
}
