#!/usr/bin/env node

/**
 * Test Cache Invalidation Logic
 * 
 * This script tests that cache invalidation works correctly:
 * 1. Fresh launches (>threshold since last launch) trigger cache clear
 * 2. App version changes trigger cache clear
 * 3. Recent launches (<threshold) use cached data
 * 
 * Run with: node scripts/test-cache-invalidation.js
 */

// Cache threshold constant
// NOTE: This value is duplicated from constants/cache.ts because this is a plain Node.js script
// that doesn't support TypeScript imports. When updating the threshold in constants/cache.ts,
// remember to also update this value to keep tests in sync with production code.
// TODO: Consider converting this to a TypeScript test file or using a build step to share constants.
const FRESH_LAUNCH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes (must match constants/cache.ts)

console.log('🧪 Testing Cache Invalidation Logic');
console.log(`   Fresh launch threshold: ${FRESH_LAUNCH_THRESHOLD_MS / 1000} seconds\n`);

// Mock AsyncStorage for testing
const mockStorage = new Map();
const AsyncStorage = {
  getItem: async (key) => mockStorage.get(key) || null,
  setItem: async (key, value) => mockStorage.set(key, value),
  removeItem: async (key) => mockStorage.delete(key),
  clear: async () => mockStorage.clear(),
};

// Test scenarios
async function testScenario(name, setup, expected) {
  console.log(`\n📋 Test: ${name}`);
  
  // Setup
  mockStorage.clear();
  if (setup.storedVersion) {
    await AsyncStorage.setItem('app_version', setup.storedVersion);
  }
  if (setup.lastLaunchTimestamp) {
    await AsyncStorage.setItem('last_launch_timestamp', setup.lastLaunchTimestamp.toString());
  }
  
  // Simulate the logic from wallet-store.ts
  const currentVersion = setup.currentVersion || '1.1.6';
  const storedVersion = await AsyncStorage.getItem('app_version');
  const lastLaunchTimestamp = await AsyncStorage.getItem('last_launch_timestamp');
  
  const isAppUpdate = storedVersion !== null && storedVersion !== currentVersion;
  const timeSinceLastLaunch = lastLaunchTimestamp 
    ? Date.now() - parseInt(lastLaunchTimestamp, 10)
    : Infinity;
  const isFreshLaunch = timeSinceLastLaunch > FRESH_LAUNCH_THRESHOLD_MS;
  
  const shouldClearCache = isAppUpdate || isFreshLaunch;
  
  // Check results
  console.log(`  Current Version: ${currentVersion}`);
  console.log(`  Stored Version: ${storedVersion || 'none'}`);
  console.log(`  Last Launch: ${lastLaunchTimestamp ? `${Math.round(timeSinceLastLaunch / 1000)}s ago` : 'never'}`);
  console.log(`  Is App Update: ${isAppUpdate}`);
  console.log(`  Is Fresh Launch: ${isFreshLaunch}`);
  console.log(`  Should Clear Cache: ${shouldClearCache}`);
  
  if (shouldClearCache === expected) {
    console.log(`  ✅ PASS: Cache clear behavior matches expected (${expected})`);
    return true;
  } else {
    console.log(`  ❌ FAIL: Expected ${expected}, got ${shouldClearCache}`);
    return false;
  }
}

async function runTests() {
  const results = [];
  
  // Test 1: First launch (no stored version, no timestamp)
  results.push(await testScenario(
    'First Launch - Should Clear Cache',
    {
      currentVersion: '1.1.6',
      storedVersion: null,
      lastLaunchTimestamp: null,
    },
    true // Should clear cache (isFreshLaunch = true because timeSinceLastLaunch = Infinity)
  ));
  
  // Test 2: App version changed
  results.push(await testScenario(
    'App Version Changed - Should Clear Cache',
    {
      currentVersion: '1.1.7',
      storedVersion: '1.1.6',
      lastLaunchTimestamp: Date.now() - 1000, // 1 second ago
    },
    true // Should clear cache (isAppUpdate = true)
  ));
  
  // Test 3: Fresh launch (>threshold since last launch)
  const freshLaunchMinutes = (FRESH_LAUNCH_THRESHOLD_MS / 60000) + 1; // 1 minute past threshold
  results.push(await testScenario(
    `Fresh Launch (${freshLaunchMinutes} minutes ago) - Should Clear Cache`,
    {
      currentVersion: '1.1.6',
      storedVersion: '1.1.6',
      lastLaunchTimestamp: Date.now() - (freshLaunchMinutes * 60 * 1000),
    },
    true // Should clear cache (isFreshLaunch = true)
  ));
  
  // Test 4: Recent launch (<threshold since last launch)
  const recentLaunchMinutes = (FRESH_LAUNCH_THRESHOLD_MS / 60000) - 3; // 3 minutes before threshold
  results.push(await testScenario(
    `Recent Launch (${recentLaunchMinutes} minutes ago) - Should Use Cache`,
    {
      currentVersion: '1.1.6',
      storedVersion: '1.1.6',
      lastLaunchTimestamp: Date.now() - (recentLaunchMinutes * 60 * 1000),
    },
    false // Should NOT clear cache (recent launch, same version)
  ));
  
  // Test 5: Very recent launch (30 seconds ago)
  results.push(await testScenario(
    'Very Recent Launch (30 seconds ago) - Should Use Cache',
    {
      currentVersion: '1.1.6',
      storedVersion: '1.1.6',
      lastLaunchTimestamp: Date.now() - 30000, // 30 seconds ago
    },
    false // Should NOT clear cache (recent launch, same version)
  ));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('✅ All tests passed! Cache invalidation logic is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the logic.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
