import { QueryClient } from '@tanstack/react-query';

// One QueryClient per browser session (created inside Providers, not module scope, to avoid
// leaking cached data across users during SSR). Defaults tuned for dashboard-style data: short
// staleness so AI job progress / coverage numbers feel live, but not so short it hammers the API.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
