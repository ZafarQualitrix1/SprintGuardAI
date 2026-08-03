'use client';

import { Suspense } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { acceptInvitationSchema, type AcceptInvitationInput } from '@sprintguard/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthSplitShell } from '@/components/auth/auth-split-shell';
import { AppInput, AppPasswordInput } from '@/components/ui/login-1';
import { Button } from '@/components/ui/button';
import { useAcceptInvitation } from '@/features/auth/api';
import { ApiError } from '@/lib/api-client';

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const acceptInvitation = useAcceptInvitation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token },
  });

  const onSubmit = (values: AcceptInvitationInput) => {
    acceptInvitation.mutate({ ...values, token }, { onSuccess: () => router.push('/dashboard') });
  };

  if (!token) {
    return (
      <p className="text-center text-sm text-destructive">
        This invitation link is missing its token. Ask your organization admin for a new invite.
      </p>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <AppInput
        label="Full name"
        placeholder="Jane Doe"
        autoComplete="off"
        error={errors.fullName?.message}
        {...register('fullName')}
      />
      <AppPasswordInput
        label="Password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      {acceptInvitation.isError ? (
        <p className="text-sm text-red-400">
          {acceptInvitation.error instanceof ApiError ? acceptInvitation.error.message : 'Unable to accept this invitation.'}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={acceptInvitation.isPending}>
        {acceptInvitation.isPending ? 'Joining…' : 'Join organization'}
      </Button>
    </form>
  );
}

export default function AcceptInvitationPage() {
  return (
    <AuthSplitShell
      title="You've been invited"
      subtitle="Set your name and password to join the organization."
      footer={
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Already have an account?{' '}
          <Link href={'/login' as never} className="text-[var(--color-heading)] underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <Suspense fallback={null}>
        <AcceptInvitationForm />
      </Suspense>
    </AuthSplitShell>
  );
}
