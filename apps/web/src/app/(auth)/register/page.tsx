'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { registerSchema, type RegisterInput } from '@sprintguard/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthSplitShell } from '@/components/auth/auth-split-shell';
import { AppInput, AppPasswordInput } from '@/components/ui/login-1';
import { Button } from '@/components/ui/button';
import { useRegister } from '@/features/auth/api';
import { ApiError } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const registerOrganization = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (values: RegisterInput) => {
    registerOrganization.mutate(values, { onSuccess: () => router.push('/dashboard') });
  };

  return (
    <AuthSplitShell
      title="Create your organization"
      subtitle="Start your SprintGuard AI workspace in under a minute."
      footer={
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Already have an account?{' '}
          <Link
            href={'/login' as never}
            className="text-[var(--color-heading)] underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <AppInput
          label="Organization name"
          placeholder="Acme Corp"
          autoComplete="off"
          error={errors.organizationName?.message}
          {...register('organizationName')}
        />
        <AppInput
          label="Full name"
          placeholder="Jane Doe"
          autoComplete="off"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {registerOrganization.isError ? (
          <p className="text-sm text-red-400">
            {registerOrganization.error instanceof ApiError
              ? registerOrganization.error.message
              : 'Unable to create your organization.'}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={registerOrganization.isPending}>
          {registerOrganization.isPending ? 'Creating…' : 'Create organization'}
        </Button>
      </form>
    </AuthSplitShell>
  );
}
