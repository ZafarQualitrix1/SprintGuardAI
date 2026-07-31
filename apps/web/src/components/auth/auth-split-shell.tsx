'use client';

import * as React from 'react';
import Image from 'next/image';
import { Bot } from 'lucide-react';

interface AuthSplitShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Shared full-bleed split-panel chrome for login/register (form left, image right, hover-tracked
// gradient glow) -- extracted so the two pages only differ in their form fields, not this shell.
export function AuthSplitShell({ title, subtitle, children, footer }: AuthSplitShellProps) {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = React.useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-xl border border-[var(--color-border)] shadow-2xl">
        <div
          className="relative flex w-full flex-col justify-center overflow-hidden px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div
            className={`pointer-events-none absolute h-[500px] w-[500px] rounded-full bg-gradient-to-r from-purple-300/20 via-blue-300/20 to-pink-300/20 blur-3xl transition-opacity duration-200 ${
              isHovering ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transform: `translate(${mousePosition.x - 250}px, ${mousePosition.y - 250}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          />
          <div className="relative z-10 mx-auto w-full max-w-sm space-y-6">
            <div className="flex items-center justify-center gap-2">
              <Bot className="h-6 w-6 text-[var(--color-heading)]" />
              <span className="text-lg font-semibold text-[var(--color-heading)]">SprintGuard AI</span>
            </div>
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-bold text-[var(--color-heading)] md:text-3xl">{title}</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
            </div>
            {children}
            {footer}
          </div>
        </div>
        <div className="relative hidden w-1/2 overflow-hidden lg:block">
          <Image
            src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 0px"
            alt=""
            className="object-cover opacity-40"
          />
        </div>
      </div>
    </div>
  );
}
