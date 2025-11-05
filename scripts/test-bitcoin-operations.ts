#!/usr/bin/env ts-node
/**
 * Bitcoin Operations Test Script
 * 
 * Validates that all Bitcoin operations are working correctly:
 * - Address generation (BIP84)
 * - UTXO fetching
 * - Balance calculation
 * - Transaction history
 * - Rate limiting compliance
 * 
 * Usage: ts-node scripts/test-bitcoin-operations.ts
 */

import { getApiStats, getRequestQueueStats, testNetworkConnectivity } from '../services/esplora-service';

// Test xpub from Blockstream Green (public testnet wallet)
// This is a PUBLIC test wallet from public documentation - NO real funds, safe to commit
// If you want to use a different test wallet, set TEST_XPUB environment variable
const TEST_XPUB = process.env.TEST_XPUB || 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<any>): Promise<void> {
  console.log(`\n🧪 Running: ${name}`);
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    results.push({
      name,
      passed: true,
      duration,
      details: result
    });
    console.log(`✅ PASSED (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      name,
      passed: false,
      duration,
      error: errorMessage
    });
    console.log(`❌ FAILED (${duration}ms): ${errorMessage}`);
  }
}

async function testNetworkConnectivity_(): Promise<any> {
  const result = await testNetworkConnectivity();
  if (!result.connected) {
    throw new Error(`No working providers. Errors: ${result.errors.join(', ')}`);
  }
  return {
    workingProviders: result.workingProviders,
    errors: result.errors
  };
}

async function testRateLimiting(): Promise<any> {
  const startTime = Date.now();
  
  // Make 5 sequential requests and measure timing
  const timings: number[] = [];
  for (let i = 0; i < 5; i++) {
    const requestStart = Date.now();
    await import('../services/esplora-service').then(m => m.esploraGet('/blocks/tip/height', 60000));
    const requestDuration = Date.now() - requestStart;
    timings.push(requestDuration);
  }
  
  const totalDuration = Date.now() - startTime;
  const avgDelay = timings.reduce((a, b) => a + b, 0) / timings.length;
  
  // Check that average delay is >= 1000ms (our rate limit)
  if (avgDelay < 900) {
    throw new Error(`Rate limiting too aggressive: avg ${avgDelay}ms < 900ms expected`);
  }
  
  return {
    totalDuration,
    avgRequestTime: Math.round(avgDelay),
    timings,
    rateLimitCompliant: avgDelay >= 900
  };
}

async function testAddressGeneration(): Promise<any> {
  const { generateAddressFromXpub } = await import('../services/wallet-service');
  
  // Generate first 3 addresses
  const addresses: string[] = [];
  for (let i = 0; i < 3; i++) {
    const address = await generateAddressFromXpub(TEST_XPUB, i);
    addresses.push(address);
    
    // Validate Bech32 format
    if (!address.startsWith('bc1')) {
      throw new Error(`Invalid address format: ${address} (expected bc1...)`);
    }
  }
  
  // Check that addresses are unique
  const uniqueAddresses = new Set(addresses);
  if (uniqueAddresses.size !== addresses.length) {
    throw new Error('Generated duplicate addresses');
  }
  
  return {
    addresses,
    format: 'Bech32 (P2WPKH)',
    derivationPath: "m/84'/0'/0'"
  };
}

async function testAddressDiscovery(): Promise<any> {
  const { discoverUsedAddresses } = await import('../services/wallet-service');
  
  // Discover addresses for test wallet
  const addresses = await discoverUsedAddresses(TEST_XPUB);
  
  if (!Array.isArray(addresses)) {
    throw new Error('Address discovery did not return an array');
  }
  
  return {
    usedAddressCount: addresses.length,
    sampleAddresses: addresses.slice(0, 3),
    gapLimit: 20
  };
}

async function testUTXOFetching(): Promise<any> {
  const { getAddressUTXOs } = await import('../services/esplora-service');
  
  // Generate a test address
  const { generateAddressFromXpub } = await import('../services/wallet-service');
  const testAddress = await generateAddressFromXpub(TEST_XPUB, 0);
  
  // Fetch UTXOs
  const result = await getAddressUTXOs(testAddress);
  
  if (result.error) {
    throw new Error(`UTXO fetch error: ${result.error}`);
  }
  
  const utxos = result.data || [];
  
  return {
    address: testAddress,
    utxoCount: utxos.length,
    sampleUTXO: utxos[0] || null,
    totalValue: utxos.reduce((sum, utxo) => sum + utxo.value, 0)
  };
}

async function testTransactionFetching(): Promise<any> {
  const { getAddressTransactions } = await import('../services/esplora-service');
  
  // Generate a test address
  const { generateAddressFromXpub } = await import('../services/wallet-service');
  const testAddress = await generateAddressFromXpub(TEST_XPUB, 0);
  
  // Fetch transactions
  const result = await getAddressTransactions(testAddress);
  
  if (result.error) {
    throw new Error(`Transaction fetch error: ${result.error}`);
  }
  
  const txs = result.data || [];
  
  return {
    address: testAddress,
    transactionCount: txs.length,
    sampleTx: txs[0] ? {
      txid: txs[0].txid,
      confirmed: txs[0].status?.confirmed || false
    } : null
  };
}

async function testCacheEfficiency(): Promise<any> {
  const stats = getApiStats();
  const queueStats = getRequestQueueStats();
  
  const cacheHitRate = stats.totalRequests > 0 
    ? (stats.cacheHits / stats.totalRequests * 100).toFixed(1)
    : '0.0';
  
  return {
    totalRequests: stats.totalRequests,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    cacheHitRate: `${cacheHitRate}%`,
    rateLimitHits: stats.rateLimitHits,
    errors: stats.errors,
    queueLength: queueStats.queueLength,
    activeRequests: queueStats.activeRequests,
    pendingDedupeCount: queueStats.pendingDedupeCount
  };
}

async function testWalletDataLoading(): Promise<any> {
  const { getWalletData } = await import('../services/wallet-service');
  
  // Load full wallet data
  const result = await getWalletData(TEST_XPUB);
  
  if (result.error) {
    throw new Error(`Wallet data error: ${result.error}`);
  }
  
  if (!result.data) {
    throw new Error('No wallet data returned');
  }
  
  const data = result.data;
  
  return {
    balanceBTC: data.balanceBTC,
    transactionCount: data.transactions?.length || 0,
    addressCount: data.addressCount,
    utxoCount: data.utxoCount
  };
}

async function main() {
  console.log('🚀 Bitcoin Operations Test Suite\n');
  console.log('=' .repeat(60));
  
  // Run all tests
  await runTest('Network Connectivity', testNetworkConnectivity_);
  await runTest('Rate Limiting Compliance', testRateLimiting);
  await runTest('Address Generation (BIP84)', testAddressGeneration);
  await runTest('Address Discovery', testAddressDiscovery);
  await runTest('UTXO Fetching', testUTXOFetching);
  await runTest('Transaction Fetching', testTransactionFetching);
  await runTest('Wallet Data Loading', testWalletDataLoading);
  await runTest('Cache Efficiency', testCacheEfficiency);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Average Duration: ${Math.round(totalDuration / results.length)}ms`);
  
  // Print failed tests details
  if (failed > 0) {
    console.log('\n❌ Failed Tests:\n');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  • ${r.name}`);
        console.log(`    Error: ${r.error}`);
        console.log(`    Duration: ${r.duration}ms`);
      });
  }
  
  // Print successful tests details
  if (passed > 0) {
    console.log('\n✅ Passed Tests:\n');
    results
      .filter(r => r.passed)
      .forEach(r => {
        console.log(`  • ${r.name} (${r.duration}ms)`);
        if (r.details) {
          console.log(`    ${JSON.stringify(r.details, null, 4).split('\n').slice(1, -1).join('\n')}`);
        }
      });
  }
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
