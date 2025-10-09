# Transaction Caching Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Transaction Fetch Request                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │ Check Transaction   │
                │ Cache First         │
                └──────────┬──────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
        ┌───────────────┐     ┌──────────────┐
        │ CACHE HIT ✓   │     │ CACHE MISS ✗ │
        └───────┬───────┘     └──────┬───────┘
                │                     │
                │                     ▼
                │            ┌─────────────────┐
                │            │ Fetch from API  │
                │            └────────┬────────┘
                │                     │
                │                     ▼
                │            ┌─────────────────┐
                │            │ Check if        │
                │            │ Confirmed?      │
                │            └────────┬────────┘
                │                     │
                │            ┌────────┴────────┐
                │            │                 │
                │            ▼                 ▼
                │   ┌────────────────┐  ┌─────────────────┐
                │   │ CONFIRMED      │  │ UNCONFIRMED     │
                │   │ Cache Forever  │  │ Cache 2 minutes │
                │   └────────┬───────┘  └────────┬────────┘
                │            │                   │
                │            └─────────┬─────────┘
                │                      │
                ▼                      ▼
        ┌──────────────────────────────────┐
        │   Return Transaction Data        │
        └──────────────────────────────────┘
```

## Cache Lifecycle

### Confirmed Transaction Lifecycle
```
┌──────────────┐
│ Transaction  │
│ Broadcast    │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Unconfirmed      │  ◄─── Cached for 2 minutes
│ (In Mempool)     │
└──────┬───────────┘
       │
       │ (Block confirmation)
       │
       ▼
┌──────────────────┐
│ Confirmed        │  ◄─── Moved to permanent cache
│ (In Block)       │       ✓ Never expires
└──────────────────┘       ✓ Survives app restart
                           ✓ No more API calls needed
```

### Cache Storage Structure

```
AsyncStorage
├── tx_cache_confirmed
│   └── [
│       {
│         txid: "abc123...",
│         data: { /* full tx data */ },
│         confirmed: true,
│         cachedAt: 1234567890,
│         blockHeight: 820456
│       },
│       { /* more confirmed txs */ }
│     ]
│
└── tx_cache_unconfirmed
    └── [
        {
          txid: "def456...",
          data: { /* full tx data */ },
          confirmed: false,
          cachedAt: 1234567890,
          blockHeight: undefined
        },
        { /* more unconfirmed txs */ }
      ]
```

## API Call Reduction Example

### Before Caching
```
User opens wallet
├── Fetch 50 transactions from API (50 calls)
│
User refreshes (2 min later)
├── Fetch 50 transactions from API (50 calls)
│
User refreshes (2 min later)
├── Fetch 50 transactions from API (50 calls)
│
Total: 150 API calls for same data! ❌
```

### After Caching
```
User opens wallet (first time)
├── Cache MISS: Fetch 50 transactions from API (50 calls)
├── Cache all 50 transactions
│   ├── 48 confirmed → permanent cache
│   └── 2 unconfirmed → 2-minute cache
│
User refreshes (2 min later)
├── Cache HIT: 48 confirmed transactions (0 calls)
├── Cache MISS: 2 unconfirmed (expired) (2 calls)
│   └── Both now confirmed → move to permanent cache
│
User refreshes (2 min later)
├── Cache HIT: 50 confirmed transactions (0 calls)
│
Total: 52 API calls (65% reduction!) ✓
```

## Performance Metrics

### Cache Hit Rate Over Time

```
First Load:     0% hit rate (cold cache)
Second Load:   96% hit rate (48/50 cached)
Third Load:   100% hit rate (all cached)
Ongoing:       95-100% hit rate (only new txs missed)
```

### API Call Reduction

```
Typical Wallet (50 transactions):
┌─────────────────────────────────────────┐
│ Without Cache: 50 calls every 2 minutes │
│ With Cache:     2-3 calls every 2 min   │
│ Reduction:     94-96%                   │
└─────────────────────────────────────────┘

Active Wallet (100 transactions, 5 pending):
┌─────────────────────────────────────────┐
│ Without Cache: 100 calls every 2 minutes│
│ With Cache:      5 calls every 2 min    │
│ Reduction:      95%                     │
└─────────────────────────────────────────┘
```

## Cache Invalidation Strategy

```
Unconfirmed Transaction:
├── Cached at:     T + 0 min
├── Expires at:    T + 2 min
├── Re-fetched:    T + 2 min
│   └── If confirmed → move to permanent cache
│   └── If still unconfirmed → re-cache for 2 more min
│
Confirmed Transaction:
├── Cached at:     T + 0 min
├── Expires at:    NEVER
└── Persists:      Forever (until manual clear)
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Wallet Store │  │  RBF Service │  │ CPFP Service │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┼──────────────────┘              │
│                           │                                 │
├───────────────────────────┼─────────────────────────────────┤
│                           ▼                                 │
│                 ┌──────────────────┐                        │
│                 │ Esplora Service  │ ◄─── Transparent       │
│                 │ (with caching)   │      caching layer     │
│                 └────────┬─────────┘                        │
│                          │                                  │
├──────────────────────────┼──────────────────────────────────┤
│                          ▼                                  │
│              ┌────────────────────────┐                     │
│              │ Transaction Cache      │                     │
│              │ Service                │                     │
│              ├────────────────────────┤                     │
│              │ • Confirmed Cache      │                     │
│              │ • Unconfirmed Cache    │                     │
│              │ • AsyncStorage         │                     │
│              └────────────────────────┘                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits Summary

✅ **Performance**: 90-95% reduction in API calls
✅ **Speed**: Instant loading of confirmed transactions
✅ **Reliability**: Less risk of rate limiting
✅ **Offline**: Cached data available without network
✅ **Bandwidth**: Significant data savings
✅ **Battery**: Fewer network requests = better battery life
✅ **UX**: Faster, more responsive wallet experience

## Cache Management Commands

```typescript
// Get cache statistics
const stats = getCacheStats();
console.log(`${stats.confirmedCount} confirmed, ${stats.unconfirmedCount} pending`);

// Clear unconfirmed cache (force refresh of pending txs)
await clearUnconfirmedCache();

// Clear all cache (use with caution)
await clearAllCache();

// Prune expired entries
const pruned = await pruneExpiredTransactions();
console.log(`Removed ${pruned} expired transactions`);
```

## Monitoring Cache Performance

Look for these log messages:

```
📦 Cache HIT (confirmed): abc123... 
📦 Cache HIT (unconfirmed): def456... (age: 45s)
📦 Cache MISS: ghi789...
💾 Cached CONFIRMED transaction: abc123... (block: 820456)
💾 Cached UNCONFIRMED transaction: def456... (TTL: 120s)
🔄 Moved transaction from unconfirmed to confirmed cache: abc123...
📦 Cache performance: 48 hits, 2 misses (96% hit rate)
```

