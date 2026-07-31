'use client';

import { InteractiveRobotSpline } from '@/components/ui/interactive-3d-robot';

const ROBOT_SCENE_URL = 'https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode';

// Fixed full-viewport layer behind the whole authenticated app shell (mounted once in
// (dashboard)/layout.tsx, so it persists across client-side nav between dashboard pages instead
// of reloading the WebGL scene on every route). Only visible through the sidebar/topbar's glass
// treatment (bg-*/85 + backdrop-blur) -- <main> stays fully opaque so sprint tables, coverage
// matrices, and forms never render over a moving background.
export function DashboardRobotBackground() {
  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      {/* No pointer-events-none here: the sidebar/topbar/main above (z-10, opaque or glass) already
          capture clicks over themselves via normal stacking -- this stays genuinely interactive in
          whatever screen area isn't covered by real UI, rather than being force-disabled. */}
      <InteractiveRobotSpline scene={ROBOT_SCENE_URL} className="h-full w-full opacity-60" />
    </div>
  );
}
