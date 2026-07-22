import { Bot } from 'lucide-react';

// Centered, chrome-free layout for login/register/forgot-password -- deliberately excludes
// Sidebar/Topbar since there is no session yet.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">SprintGuard AI</span>
        </div>
        {children}
      </div>
    </div>
  );
}
