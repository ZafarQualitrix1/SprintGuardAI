// Minimal passthrough for login/register/forgot-password -- deliberately excludes
// Sidebar/Topbar since there is no session yet. Login/register render their own full-bleed
// split-panel chrome (components/auth/auth-split-shell.tsx); forgot-password renders its own
// centered card since it doesn't use that shell.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
