import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { SessionGuard } from '@/components/layout/session-guard';
import { DashboardRobotBackground } from '@/components/layout/dashboard-robot-background';

// Authenticated app shell -- SessionGuard redirects to /login when there is no valid session.
// DashboardRobotBackground is mounted once here (not per-page) so the 3D scene persists across
// client-side nav between dashboard routes instead of reloading on every page. It sits at z-0;
// Sidebar/Topbar/main all float above it with a glass (semi-transparent + blurred) treatment.
// <main> uses a much lighter tint (/90 vs /85, minimal blur) than Sidebar/Topbar -- real content
// (Card, Table-in-Card, Dialog, Popover) all set their own solid bg-card/bg-background/bg-popover
// independent of <main>'s class, so they stay fully opaque; only the negative space between them
// (padding, gaps, bare page titles) reveals the scene, which is what makes the robot visible at
// all on data-heavy pages instead of being permanently hidden behind a 100%-opaque work surface.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <div className="relative flex h-screen overflow-hidden">
        <DashboardRobotBackground />
        <Sidebar />
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="relative z-10 flex-1 overflow-y-auto bg-background/90 backdrop-blur-sm p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionGuard>
  );
}
