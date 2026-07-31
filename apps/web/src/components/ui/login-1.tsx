'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// Adapted from a static "login-1" design reference into real, reusable form primitives:
// forwardRef (so react-hook-form's `register()` can attach) and an `error` slot, instead of the
// original uncontrolled/non-forwarding demo version.
export interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(
  ({ label, icon, error, className, id, ...rest }, ref) => {
    const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = React.useState(false);
    // react-hook-form's register() supplies `name` but not `id` -- fall back to it so the
    // <label> stays associated with its input (accessibility: click-to-focus, screen readers).
    const generatedId = React.useId();
    const inputId = id ?? rest.name ?? generatedId;

    const handleMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
      <div className="relative w-full min-w-[200px]">
        {label ? (
          <label htmlFor={inputId} className="mb-2 block text-sm text-[var(--color-text-primary)]">
            {label}
          </label>
        ) : null}
        <div className="relative w-full">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'peer relative z-10 h-12 w-full rounded-md border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 font-light text-[var(--color-heading)] outline-none drop-shadow-sm transition-all duration-200 ease-in-out placeholder:font-normal placeholder:text-[var(--color-text-secondary)] focus:bg-[var(--color-bg)]',
              icon ? 'pr-10' : '',
              className,
            )}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            {...rest}
          />
          {isHovering ? (
            <>
              <div
                className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-[2px] overflow-hidden rounded-t-md"
                style={{
                  background: `radial-gradient(30px circle at ${mousePosition.x}px 0px, var(--color-heading) 0%, transparent 70%)`,
                }}
              />
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-[2px] overflow-hidden rounded-b-md"
                style={{
                  background: `radial-gradient(30px circle at ${mousePosition.x}px 2px, var(--color-heading) 0%, transparent 70%)`,
                }}
              />
            </>
          ) : null}
          {icon ? <div className="absolute right-3 top-1/2 z-20 -translate-y-1/2">{icon}</div> : null}
        </div>
        {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
      </div>
    );
  },
);
AppInput.displayName = 'AppInput';

// Same visual treatment as AppInput, with the show/hide toggle SprintGuard's existing
// PasswordInput already provides -- kept as a separate component rather than overloading
// AppInput's `icon` slot with toggle state at every call site.
export type AppPasswordInputProps = Omit<AppInputProps, 'type' | 'icon'>;

export const AppPasswordInput = React.forwardRef<HTMLInputElement, AppPasswordInputProps>(
  (props, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <AppInput
        ref={ref}
        type={visible ? 'text' : 'password'}
        icon={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-heading)]"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        {...props}
      />
    );
  },
);
AppPasswordInput.displayName = 'AppPasswordInput';
