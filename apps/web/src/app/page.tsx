import { redirect } from 'next/navigation';

// Entry point: real auth-aware routing lands in the Authentication Module step. For now this
// unconditionally routes into the app shell; (dashboard)/layout.tsx is where the session check
// will live once wired up.
export default function RootPage() {
  redirect('/dashboard');
}
