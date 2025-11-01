/**
 * Cache Configuration Constants
 * 
 * These constants control cache behavior across the app.
 * Centralizing them ensures consistency and easier maintenance.
 */

/**
 * Fresh Launch Threshold
 * 
 * The app will clear all caches if this amount of time has passed since the last launch.
 * This ensures physical devices get fresh data even when the app version hasn't changed.
 * 
 * Recommended values:
 * - 5 minutes (production): Good balance between fresh data and performance
 * - 1 minute (testing): Faster cache invalidation for debugging
 * - 15 minutes (low-bandwidth): Less frequent refreshes to save data
 */
export const FRESH_LAUNCH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Address Cache TTLs
 * 
 * How long to cache blockchain data for addresses before fetching fresh data.
 * Shorter TTLs = fresher data but more API calls
 * Longer TTLs = less API calls but potentially stale data
 */
export const TXIDS_TTL_MS = 2 * 60 * 1000; // 2 minutes
export const STATS_TTL_MS = 2 * 60 * 1000; // 2 minutes  
export const UTXOS_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * React Query Cache Configuration
 * 
 * Controls how React Query caches and refetches data.
 */
export const REACT_QUERY_STALE_TIME = 2 * 60 * 1000; // 2 minutes
export const REACT_QUERY_GC_TIME = 30 * 60 * 1000; // 30 minutes
