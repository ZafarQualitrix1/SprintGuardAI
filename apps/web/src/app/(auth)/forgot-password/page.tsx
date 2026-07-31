import { Bot } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

// Scaffold only -- data fetching and feature components are wired up in a later implementation
// step (docs/architecture build sequence). Establishes routing, layout, and title for this page.
// Self-contained (unlike login/register, which use components/auth/auth-split-shell.tsx) since
// AuthLayout no longer supplies shared centering/branding chrome.
export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">SprintGuard AI</span>
        </div>
        <div>
          <PageHeader title="Reset password" description="We'll email you a reset link." />
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">Coming soon.</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
