"use client";

import { useEffect } from 'react';
import type { OptimizeResponse } from '@/lib/types/optimizer';
import { saveCachedLineup } from '@/lib/cache';

/**
 * Client-side cache handler that saves optimization data to localStorage.
 * Runs once on mount when successful optimization data is available.
 */
export function CacheHandler({ data }: { data: OptimizeResponse }) {
  useEffect(() => {
    saveCachedLineup(data);
  }, [data]);

  return null;
}
