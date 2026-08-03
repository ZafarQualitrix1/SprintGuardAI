// Minimal passthrough for login/register/forgot-password/reset-password/accept-invitation --
// deliberately excludes Sidebar/Topbar since there is no session yet. Each page renders its own
// full-bleed split-panel chrome (components/auth/auth-split-shell.tsx).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
