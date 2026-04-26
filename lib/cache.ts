import type { OptimizeResponse } from '@/lib/types/optimizer';

/**
 * localStorage key for caching successful lineup optimizations.
 * Enables graceful fallback when optimization API is unavailable.
 */
const CACHE_KEY = 'fpl_last_successful_lineup';

/**
 * Cache staleness threshold: 24 hours in milliseconds.
 */
const STALENESS_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export interface CachedLineup {
  lineup: OptimizeResponse['lineup'];
  captain: OptimizeResponse['captain'];
  expectedPoints: number;
  formation: string;
  timestamp: string;
}

/**
 * Save successful optimization result to localStorage.
 * Handles localStorage unavailable gracefully (SSR, private browsing).
 *
 * @param data - Optimization response to cache
 */
export function saveCachedLineup(data: OptimizeResponse): void {
  try {
    const cacheData: CachedLineup = {
      lineup: data.lineup,
      captain: data.captain,
      expectedPoints: data.expectedPoints,
      formation: data.formation,
      timestamp: new Date().toISOString(),
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('[cache] Saved lineup to localStorage:', {
        key: CACHE_KEY,
        timestamp: cacheData.timestamp,
        expectedPoints: cacheData.expectedPoints,
      });
    }
  } catch (error) {
    // localStorage may be unavailable (SSR, private browsing, quota exceeded)
    console.warn('[cache] Failed to save to localStorage:', error);
  }
}

/**
 * Retrieve cached optimization result from localStorage.
 * Returns null if cache is empty, corrupted, or unavailable.
 */
export function getCachedLineup(): CachedLineup | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        console.log('[cache] No cached lineup found');
        return null;
      }

      const parsed = JSON.parse(cached) as CachedLineup;

      // Validate required fields
      if (!parsed.lineup || !parsed.captain || !parsed.timestamp) {
        console.warn('[cache] Cached data is malformed, clearing');
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      console.log('[cache] Retrieved cached lineup:', {
        timestamp: parsed.timestamp,
        expectedPoints: parsed.expectedPoints,
        isStale: isCacheStale(parsed),
      });

      return parsed;
    }

    return null;
  } catch (error) {
    // Corrupted cache or localStorage unavailable
    console.warn('[cache] Failed to read from localStorage:', error);

    // Clear corrupted cache entry
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(CACHE_KEY);
      }
    } catch {
      // Ignore cleanup failures
    }

    return null;
  }
}

/**
 * Check if cached lineup is stale (>24 hours old).
 *
 * @param cached - Cached lineup data with timestamp
 * @returns true if cache is older than 24 hours
 */
export function isCacheStale(cached: CachedLineup): boolean {
  try {
    const cachedTime = new Date(cached.timestamp).getTime();
    const now = Date.now();
    const age = now - cachedTime;

    return age > STALENESS_THRESHOLD_MS;
  } catch {
    // Invalid timestamp format
    return true;
  }
}

/**
 * Format cache timestamp for user-facing display.
 *
 * @param timestamp - ISO 8601 timestamp string
 * @returns Human-readable relative time (e.g., "2 hours ago")
 */
export function formatCacheAge(timestamp: string): string {
  try {
    const cachedTime = new Date(timestamp).getTime();
    const now = Date.now();
    const ageMs = now - cachedTime;

    const minutes = Math.floor(ageMs / (60 * 1000));
    const hours = Math.floor(ageMs / (60 * 60 * 1000));
    const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  } catch {
    return 'unknown';
  }
}
