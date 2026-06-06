'use client';

import { useCallback, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

import {
  PUBLIC_CATALOG_CHANNEL,
  PUBLIC_CATALOG_EVENT,
} from '@/lib/pusher/channels';
import { disconnectPusherSafely } from '@/lib/pusher/safe-teardown';

const FALLBACK_POLL_MS = 45_000;
const MIN_TIMER_MS = 1_000;
const BOUNDARY_BUFFER_MS = 500;
/** Не чаще одного client-refetch (защита от циклов refresh). */
const MIN_REFETCH_GAP_MS = 5_000;

function delayUntilNextBoundary(
  nextVisibilityChangeAt: string | null | undefined,
  watchStartDates: (string | null | undefined)[]
): number {
  const now = Date.now();
  const candidates: number[] = [];

  if (nextVisibilityChangeAt) {
    const t = new Date(nextVisibilityChangeAt).getTime();
    if (Number.isFinite(t) && t > now) candidates.push(t);
  }

  for (const iso of watchStartDates) {
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (Number.isFinite(t) && t > now) candidates.push(t);
  }

  if (candidates.length === 0) return FALLBACK_POLL_MS;
  const minMs = Math.min(...candidates);
  return Math.max(minMs - now + BOUNDARY_BUFFER_MS, MIN_TIMER_MS);
}

/** Pusher + таймер по ближайшему start_at + периодический poll (главная, hero). */
export function usePublicCatalogRefresh(
  refetch: () => void | Promise<void>,
  watchStartDates: (string | null | undefined)[],
  nextVisibilityChangeAt?: string | null
) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const lastRefetchAtRef = useRef(0);

  const runRefetch = useCallback(() => {
    const now = Date.now();
    if (now - lastRefetchAtRef.current < MIN_REFETCH_GAP_MS) return;
    lastRefetchAtRef.current = now;
    void refetchRef.current();
  }, []);

  const watchKey = watchStartDates.filter(Boolean).join('|');

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!key) return;

    const pusher = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
    });
    const channel = pusher.subscribe(PUBLIC_CATALOG_CHANNEL);
    channel.bind(PUBLIC_CATALOG_EVENT, runRefetch);

    return () => {
      disconnectPusherSafely(pusher, [channel]);
    };
  }, [runRefetch]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = 0;

    const schedule = () => {
      if (cancelled) return;
      const delay = delayUntilNextBoundary(nextVisibilityChangeAt, watchStartDates);
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        runRefetch();
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [nextVisibilityChangeAt, watchKey, runRefetch]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') runRefetch();
    }, FALLBACK_POLL_MS);

    return () => window.clearInterval(id);
  }, [runRefetch]);
}
