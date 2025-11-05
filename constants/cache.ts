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
 * Address Metadata Cache TTL
 * 
 * How long to cache address discovery metadata (used/unused status).
 * This is intentionally shorter than other caches to ensure we don't show
 * used addresses after receiving funds (address reuse prevention).
 * 
 * 30 seconds ensures quick response to incoming transactions while still
 * providing reasonable caching to avoid excessive API calls.
 */
export const ADDRESS_METADATA_CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * React Query Cache Configuration
 * 
 * Controls how React Query caches and refetches data.
 */
export const REACT_QUERY_STALE_TIME = 2 * 60 * 1000; // 2 minutes
export const REACT_QUERY_GC_TIME = 30 * 60 * 1000; // 30 minutes

/**
 * Address Generation Configuration
 * 
 * Controls rate limiting and warnings for address generation.
 */

/**
 * Minimum interval between address generations (milliseconds)
 * Prevents API abuse and rate limiting by enforcing a cooldown.
 */
export const ADDRESS_GENERATION_COOLDOWN_MS = 3 * 1000; // 3 seconds

/**
 * Gap limit warning threshold
 * Shows a warning to the user after generating this many addresses.
 * Standard BIP44 gap limit is 20, so we warn at 15 to give users time
 * to fund addresses before hitting the limit.
 */
export const GAP_LIMIT_WARNING_THRESHOLD = 15;

/**
 * Address verification timeout (milliseconds)
 * Timeout for blockchain API calls when verifying address usage.
 */
export const ADDRESS_VERIFICATION_TIMEOUT_MS = 30 * 1000; // 30 seconds

/**
 * Enable production safeguard verification
 * When true, every address is double-checked against the blockchain before display.
 * Set to false in development to reduce API calls during testing.
 */
export const ENABLE_ADDRESS_VERIFICATION_SAFEGUARD = true; // Always enabled for now
