/**
 * Cache Configuration Constants
 * 
 * These constants control cache behavior across the app.
 * Centralizing them ensures consistency and easier maintenance.
 */


/**
 * Address Cache TTLs
 * 
 * How long to cache blockchain data for addresses before fetching fresh data.
 * Based on best practices from Blockstream Green, Trust Wallet, and Bluewallet:
 * - Confirmed data (txids, stats): 5 minutes (rarely changes)
 * - UTXOs: 2 minutes (can change with incoming transactions)
 * 
 * Rationale:
 * - Transaction IDs and stats for confirmed transactions are immutable
 * - UTXOs need more frequent updates to catch incoming payments
 * - Balances between API calls to prevent 429 errors
 */
export const TXIDS_TTL_MS = 5 * 60 * 1000; // 5 minutes (increased from 2 for confirmed data)
export const STATS_TTL_MS = 5 * 60 * 1000; // 5 minutes (increased from 2 for confirmed data)  
export const UTXOS_TTL_MS = 2 * 60 * 1000; // 2 minutes (keep short for balance updates)

/**
 * Address Metadata Cache TTL
 * 
 * How long to cache address discovery metadata (used/unused status).
 * This is intentionally shorter than other caches to ensure we don't show
 * used addresses after receiving funds (address reuse prevention).
 * 
 * Increased to 2 minutes to reduce API load while still being responsive.
 * The receive screen clears cache on focus to ensure fresh data when actively receiving.
 */
export const ADDRESS_METADATA_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes (increased from 30s)

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
