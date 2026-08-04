import { redirect } from 'next/navigation';

// Bare /dashboard/automation has no content of its own -- API Automation is the only functional
// module this release (Web Automation is a placeholder), so this is where the sidebar link's
// section header would otherwise land.
export default function AutomationIndexPage() {
  redirect('/dashboard/automation/api');
}
