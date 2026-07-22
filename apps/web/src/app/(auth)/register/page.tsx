'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { registerSchema, type RegisterInput } from '@sprintguard/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
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
    <Card>
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>Start your SprintGuard AI workspace in under a minute.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization name</Label>
            <Input
              id="organizationName"
              placeholder="Acme Corp"
              autoComplete="off"
              {...register('organizationName')}
            />
            {errors.organizationName ? (
              <p className="text-xs text-destructive">{errors.organizationName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" placeholder="Jane Doe" autoComplete="off" {...register('fullName')} />
            {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="off"
              {...register('email')}
            />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" autoComplete="new-password" {...register('password')} />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>
          {registerOrganization.isError ? (
            <p className="text-sm text-destructive">
              {registerOrganization.error instanceof ApiError
                ? registerOrganization.error.message
                : 'Unable to create your organization.'}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={registerOrganization.isPending}>
            {registerOrganization.isPending ? 'Creating…' : 'Create organization'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href={'/login' as never} className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
