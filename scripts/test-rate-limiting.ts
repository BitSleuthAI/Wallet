/**
 * Test script to verify rate limiting implementation
 * Run with: npx ts-node scripts/test-rate-limiting.ts
 */

import { esploraGet, getRequestQueueStats, getApiStats, resetApiStats } from '../services/esplora-service';

async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting Implementation\n');
  
  // Reset statistics
  resetApiStats();
  
  console.log('📊 Test 1: Sequential requests with rate limiting');
  console.log('Expected: 250ms delay between requests');
  
  const startTime = Date.now();
  
  // Make 5 sequential requests
  const requests = [
    esploraGet('/blocks/tip/height', 60000),
    esploraGet('/blocks/tip/height', 60000),
    esploraGet('/blocks/tip/height', 60000),
    esploraGet('/blocks/tip/height', 60000),
    esploraGet('/blocks/tip/height', 60000),
  ];
  
  try {
    const results = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ All requests completed in ${duration}ms`);
    console.log(`📊 Expected minimum: 1000ms (4 delays × 250ms)`);
    console.log(`📊 Actual: ${duration}ms`);
    
    if (duration >= 1000) {
      console.log('✅ Rate limiting is working correctly!\n');
    } else {
      console.log('⚠️ Rate limiting may not be working as expected\n');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  // Show statistics
  console.log('📊 Test 2: API Statistics');
  const stats = getApiStats();
  console.log(`Total requests: ${stats.totalRequests}`);
  console.log(`Cache hits: ${stats.cacheHits}`);
  console.log(`Cache misses: ${stats.cacheMisses}`);
  console.log(`Rate limit hits: ${stats.rateLimitHits}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Cache hit rate: ${(stats.cacheHits / stats.totalRequests * 100).toFixed(1)}%`);
  
  // Show queue stats
  console.log('\n📊 Test 3: Queue Statistics');
  const queueStats = getRequestQueueStats();
  console.log(`Queue length: ${queueStats.queueLength}`);
  console.log(`Active requests: ${queueStats.activeRequests}`);
  
  console.log('\n✅ Rate limiting test complete!');
}

// Run the test
testRateLimiting().catch(console.error);
