'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import type { ReleaseReport } from '@sprintguard/shared';

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL ?? 'http://localhost:3002';

// Subscribes to live Release Readiness score updates for a sprint. The push comes from the
// persistent worker process (apps/api/src/worker.ts), not the serverless REST API -- see that
// file for why they're split. Best-effort: if the worker/socket connection is unavailable, the
// page still works via the normal GET/"Compute readiness" flow, just without live push.
export function useReleaseReadinessRealtime(sprintId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sprintId) return;

    const socket = io(`${REALTIME_URL}/release-readiness`, {
      withCredentials: true,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => socket.emit('subscribe', sprintId));
    socket.on('release-readiness:updated', (report: ReleaseReport) => {
      if (report.sprintId !== sprintId) return;
      queryClient.setQueryData(['release', sprintId], report);
      queryClient.invalidateQueries({ queryKey: ['release-history', sprintId] });
    });

    return () => {
      socket.emit('unsubscribe', sprintId);
      socket.disconnect();
    };
  }, [sprintId, queryClient]);
}
