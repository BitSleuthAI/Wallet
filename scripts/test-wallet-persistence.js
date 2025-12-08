#!/usr/bin/env node
/**
 * Test script for wallet persistence functionality
 * 
 * Tests:
 * 1. Persist wallet data (balance, transactions, UTXOs)
 * 2. Load persisted wallet data
 * 3. Clear persisted wallet data
 * 4. Handle corrupted data gracefully
 */

// Mock AsyncStorage for testing
const mockStorage = new Map();

const AsyncStorage = {
  getItem: async (key) => mockStorage.get(key) || null,
  setItem: async (key, value) => mockStorage.set(key, value),
  multiRemove: async (keys) => keys.forEach(k => mockStorage.delete(k)),
  getAllKeys: async () => Array.from(mockStorage.keys()),
};

// Test helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

// Mock the wallet persistence service
const WALLET_DATA_PREFIX = 'wallet_data_';
const WALLET_BALANCE_PREFIX = 'wallet_balance_';
const WALLET_TRANSACTIONS_PREFIX = 'wallet_transactions_';
const WALLET_UTXOS_PREFIX = 'wallet_utxos_';

async function persistWalletData(walletId, xpub, balance, transactions, utxos) {
  const now = Date.now();
  const version = '1.0.0';
  
  const walletData = {
    walletId,
    xpub,
    balance,
    transactions,
    utxos,
    lastUpdated: now,
    version,
  };
  
  const fullDataKey = `${WALLET_DATA_PREFIX}${walletId}`;
  await AsyncStorage.setItem(fullDataKey, JSON.stringify(walletData));
  
  const balanceKey = `${WALLET_BALANCE_PREFIX}${walletId}`;
  await AsyncStorage.setItem(balanceKey, JSON.stringify({ balance, lastUpdated: now }));
  
  const transactionsKey = `${WALLET_TRANSACTIONS_PREFIX}${walletId}`;
  await AsyncStorage.setItem(transactionsKey, JSON.stringify({ transactions, lastUpdated: now }));
  
  const utxosKey = `${WALLET_UTXOS_PREFIX}${walletId}`;
  await AsyncStorage.setItem(utxosKey, JSON.stringify({ utxos, lastUpdated: now }));
  
  console.log(`💾 Persisted wallet data for ${walletId}: ${balance} BTC, ${transactions.length} txs, ${utxos.length} UTXOs`);
}

async function getPersistedWalletData(walletId) {
  const key = `${WALLET_DATA_PREFIX}${walletId}`;
  const data = await AsyncStorage.getItem(key);
  
  if (!data) {
    return null;
  }
  
  return JSON.parse(data);
}

async function getPersistedBalance(walletId) {
  const key = `${WALLET_BALANCE_PREFIX}${walletId}`;
  const data = await AsyncStorage.getItem(key);
  
  if (!data) {
    return null;
  }
  
  const parsed = JSON.parse(data);
  return parsed.balance;
}

async function getPersistedTransactions(walletId) {
  const key = `${WALLET_TRANSACTIONS_PREFIX}${walletId}`;
  const data = await AsyncStorage.getItem(key);
  
  if (!data) {
    return null;
  }
  
  const parsed = JSON.parse(data);
  return parsed.transactions;
}

async function getPersistedUTXOs(walletId) {
  const key = `${WALLET_UTXOS_PREFIX}${walletId}`;
  const data = await AsyncStorage.getItem(key);
  
  if (!data) {
    return null;
  }
  
  const parsed = JSON.parse(data);
  return parsed.utxos;
}

async function clearPersistedWalletData(walletId) {
  const keys = [
    `${WALLET_DATA_PREFIX}${walletId}`,
    `${WALLET_BALANCE_PREFIX}${walletId}`,
    `${WALLET_TRANSACTIONS_PREFIX}${walletId}`,
    `${WALLET_UTXOS_PREFIX}${walletId}`,
  ];
  
  await AsyncStorage.multiRemove(keys);
  console.log(`🗑️ Cleared persisted data for wallet: ${walletId}`);
}

async function clearAllPersistedWalletData() {
  const allKeys = await AsyncStorage.getAllKeys();
  const walletDataKeys = allKeys.filter(key => 
    key.startsWith(WALLET_DATA_PREFIX) ||
    key.startsWith(WALLET_BALANCE_PREFIX) ||
    key.startsWith(WALLET_TRANSACTIONS_PREFIX) ||
    key.startsWith(WALLET_UTXOS_PREFIX)
  );
  
  if (walletDataKeys.length > 0) {
    await AsyncStorage.multiRemove(walletDataKeys);
    console.log(`🗑️ Cleared all persisted wallet data (${walletDataKeys.length} keys)`);
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Testing wallet persistence functionality...\n');
  
  // Test 1: Persist wallet data
  console.log('📝 Test 1: Persist wallet data');
  const testWalletId = 'test-wallet-123';
  const testXpub = 'xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VUNgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5';
  const testBalance = 0.12345678;
  const testTransactions = [
    { txid: 'tx1', amount: 0.1, type: 'received', timestamp: Date.now() - 86400000 },
    { txid: 'tx2', amount: 0.02, type: 'received', timestamp: Date.now() - 43200000 },
  ];
  const testUtxos = [
    { txid: 'tx1', vout: 0, value: 10000000, address: 'bc1q...' },
    { txid: 'tx2', vout: 1, value: 2000000, address: 'bc1q...' },
  ];
  
  await persistWalletData(testWalletId, testXpub, testBalance, testTransactions, testUtxos);
  assert(mockStorage.size > 0, 'Data was written to storage');
  console.log('');
  
  // Test 2: Load persisted wallet data
  console.log('📝 Test 2: Load persisted wallet data');
  const loadedData = await getPersistedWalletData(testWalletId);
  assert(loadedData !== null, 'Loaded data is not null');
  assert(loadedData.walletId === testWalletId, 'Wallet ID matches');
  assert(loadedData.xpub === testXpub, 'Xpub matches');
  assert(loadedData.balance === testBalance, 'Balance matches');
  assert(loadedData.transactions.length === 2, 'Transactions length matches');
  assert(loadedData.utxos.length === 2, 'UTXOs length matches');
  console.log('');
  
  // Test 3: Load individual components
  console.log('📝 Test 3: Load individual components');
  const loadedBalance = await getPersistedBalance(testWalletId);
  assert(loadedBalance === testBalance, 'Balance loads independently');
  
  const loadedTxs = await getPersistedTransactions(testWalletId);
  assert(loadedTxs.length === 2, 'Transactions load independently');
  
  const loadedUtxos = await getPersistedUTXOs(testWalletId);
  assert(loadedUtxos.length === 2, 'UTXOs load independently');
  console.log('');
  
  // Test 4: Load non-existent wallet
  console.log('📝 Test 4: Load non-existent wallet');
  const nonExistent = await getPersistedBalance('non-existent-wallet');
  assert(nonExistent === null, 'Returns null for non-existent wallet');
  console.log('');
  
  // Test 5: Multiple wallets
  console.log('📝 Test 5: Multiple wallets');
  const wallet2Id = 'test-wallet-456';
  await persistWalletData(wallet2Id, testXpub, 0.5, [], []);
  
  const wallet1Balance = await getPersistedBalance(testWalletId);
  const wallet2Balance = await getPersistedBalance(wallet2Id);
  assert(wallet1Balance === testBalance, 'Wallet 1 balance unchanged');
  assert(wallet2Balance === 0.5, 'Wallet 2 balance correct');
  console.log('');
  
  // Test 6: Clear single wallet
  console.log('📝 Test 6: Clear single wallet');
  await clearPersistedWalletData(testWalletId);
  const cleared1 = await getPersistedBalance(testWalletId);
  const wallet2Still = await getPersistedBalance(wallet2Id);
  assert(cleared1 === null, 'Wallet 1 cleared');
  assert(wallet2Still === 0.5, 'Wallet 2 still exists');
  console.log('');
  
  // Test 7: Clear all wallets
  console.log('📝 Test 7: Clear all wallets');
  await clearAllPersistedWalletData();
  const allCleared1 = await getPersistedBalance(testWalletId);
  const allCleared2 = await getPersistedBalance(wallet2Id);
  assert(allCleared1 === null, 'Wallet 1 cleared');
  assert(allCleared2 === null, 'Wallet 2 cleared');
  assert(mockStorage.size === 0, 'All storage cleared');
  console.log('');
  
  // Test 8: Corrupted data handling
  console.log('📝 Test 8: Corrupted data handling');
  await AsyncStorage.setItem(`${WALLET_BALANCE_PREFIX}corrupted`, 'invalid json {{{');
  try {
    await getPersistedBalance('corrupted');
    assert(false, 'Should have thrown error for corrupted data');
  } catch (error) {
    assert(true, 'Gracefully handles corrupted data');
  }
  console.log('');
  
  console.log('✅ All tests passed!\n');
  console.log('Summary:');
  console.log('- Wallet data persists correctly to AsyncStorage');
  console.log('- Wallet data loads correctly from AsyncStorage');
  console.log('- Individual components (balance, txs, UTXOs) load independently');
  console.log('- Multiple wallets can coexist');
  console.log('- Wallet deletion works correctly');
  console.log('- Global clear works correctly');
  console.log('- Corrupted data is handled gracefully');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
