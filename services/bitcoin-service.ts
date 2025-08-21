import { BitcoinPrice, Transaction, UTXO } from '@/types/wallet';
import { Platform } from 'react-native';

// Don't initialize ECC at module load time - do it lazily when needed
let eccInitialized = false;

const ensureECC = () => {
  if (eccInitialized) return;
  
  try {
    const { initializeCrypto } = require('./crypto-polyfill');
    initializeCrypto();
    
    const ecc = (global as any).ecc;
    if (!ecc) {
      console.warn('⚠️ ECC library not available, some features may not work');
      return;
    }
    
    const bitcoin = require('bitcoinjs-lib');
    if (typeof bitcoin.initEccLib === 'function') {
      bitcoin.initEccLib(ecc);
      console.log('✅ ECC library initialized for bitcoin service');
    }
    
    eccInitialized = true;
  } catch (error) {
    console.warn('⚠️ Failed to initialize ECC for bitcoin service:', error);
  }
};



// Legacy constants for backward compatibility
const BLOCKSTREAM_API = 'https://blockstream.info/api';
const MEMPOOL_API = 'https://mempool.space/api';

const API_BASE = Platform.select({
  web: MEMPOOL_API,
  default: BLOCKSTREAM_API,
});



// Test network connectivity
export const testNetworkConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing network connectivity...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Try a simple connectivity test
    const testEndpoints = [
      'https://httpbin.org/get',
      'https://api.github.com',
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
          ...(Platform.OS === 'web' ? { 
            mode: 'cors' as const,
            credentials: 'omit' as const,
          } : {}),
        });
        
        if (response.ok) {
          clearTimeout(timeoutId);
          console.log(`✅ Network connectivity test: PASSED (${endpoint})`);
          return true;
        }
      } catch (endpointError) {
        console.log(`❌ Connectivity test failed for ${endpoint}:`, endpointError);
        continue;
      }
    }
    
    clearTimeout(timeoutId);
    console.log('❌ Network connectivity test: FAILED (all endpoints)');
    return false;
  } catch (error) {
    console.warn('⚠️ Network connectivity test failed:', error);
    return false;
  }
};

// Retry mechanism with exponential backoff
async function fetchWithRetry(input: string, init?: RequestInit & { timeoutMs?: number }, maxRetries: number = 2): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchJSON(input, init);
      if (attempt > 0) {
        console.log(`✅ Request succeeded on retry ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 4000); // Max 4 second delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

async function fetchJSON(input: string, init?: RequestInit & { timeoutMs?: number }) {
  const { timeoutMs = 15000, ...rest } = init ?? {};
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(input, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BitcoinWallet/1.0',
        ...(rest?.headers ?? {}),
      },
      ...(Platform.OS === 'web' ? { 
        mode: 'cors' as const,
        credentials: 'omit' as const,
      } : {}),
      ...rest,
    });
    
    if (!response.ok) {
      console.warn(`API request failed: ${response.status} ${response.statusText} for ${input}`);
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn(`Network request failed for ${input}:`, error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error - please check your connection');
      }
      if (error.message.includes('CORS')) {
        throw new Error('Network configuration error');
      }
    }
    
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper function to normalize API responses
function normalizeBalanceResponse(data: any, apiName: string): number {
  try {
    if (apiName === 'BlockCypher') {
      // BlockCypher returns balance in satoshis
      return (data.balance || 0) / 100000000;
    } else if (apiName === 'Blockchain.info') {
      // Blockchain.info returns balance in satoshis
      return (data.final_balance || 0) / 100000000;
    } else {
      // Blockstream/Mempool format
      if (!data.chain_stats) {
        console.warn(`Invalid response format from ${apiName}:`, data);
        throw new Error('Invalid response format');
      }
      return (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000;
    }
  } catch (error) {
    console.warn(`Error normalizing balance response from ${apiName}:`, error);
    throw error;
  }
}

// Helper function to normalize transaction responses
function normalizeTransactionResponse(data: any, apiName: string): any[] {
  try {
    if (apiName === 'BlockCypher') {
      // BlockCypher has different format
      return data.txs || [];
    } else if (apiName === 'Blockchain.info') {
      // Blockchain.info returns transactions in 'txs' array
      return data.txs || [];
    } else {
      // Blockstream/Mempool format
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    console.warn(`Error normalizing transaction response from ${apiName}:`, error);
    return [];
  }
}
// Multiple price API endpoints for redundancy
const PRICE_APIS = [
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
    parser: (data: any) => {
      console.log('CoinGecko response:', data);
      return {
        usd: data.bitcoin?.usd || 0,
        usd_24h_change: data.bitcoin?.usd_24h_change || 0,
      };
    }
  },
  {
    name: 'CoinDesk',
    url: 'https://api.coindesk.com/v1/bpi/currentprice.json',
    parser: (data: any) => {
      console.log('CoinDesk response:', data);
      return {
        usd: parseFloat(data.bpi?.USD?.rate?.replace(/,/g, '') || '0'),
        usd_24h_change: 0, // CoinDesk doesn't provide 24h change
      };
    }
  },
  {
    name: 'Blockchain.info',
    url: 'https://blockchain.info/ticker',
    parser: (data: any) => {
      console.log('Blockchain.info response:', data);
      return {
        usd: data.USD?.last || 0,
        usd_24h_change: 0, // Blockchain.info doesn't provide 24h change in this endpoint
      };
    }
  },

];

export const getBitcoinPrice = async (): Promise<BitcoinPrice> => {
  // Try each API endpoint in sequence
  for (const api of PRICE_APIS) {
    try {
      console.log(`💰 Fetching Bitcoin price from ${api.name}...`);
      

      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout
      
      const response = await fetch(api.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BitcoinWallet/1.0',
        },
        ...(Platform.OS === 'web' ? { 
          mode: 'cors' as const,
          credentials: 'omit' as const,
        } : {}),
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const priceData = api.parser(data);
      
      if (!priceData.usd || priceData.usd <= 0) {
        throw new Error(`Invalid price data from ${api.name}: ${priceData.usd}`);
      }
      
      console.log(`✅ Bitcoin price fetched successfully from ${api.name}:`, priceData.usd);
      return priceData;
    } catch (error) {
      console.warn(`❌ Failed to fetch from ${api.name}:`, error);
      // Continue to next API
    }
  }
  
  // All APIs failed - throw error instead of returning fallback
  console.error('⚠️ All price APIs failed');
  throw new Error('Unable to fetch Bitcoin price from any API');
};

// Validate Bitcoin address format
export const isValidBitcoinAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Basic format checks
  if (address.length < 26 || address.length > 62) {
    return false;
  }
  
  // Check for valid Bitcoin address prefixes
  const validPrefixes = ['1', '3', 'bc1', 'tb1']; // Legacy, P2SH, Bech32 mainnet, Bech32 testnet
  const hasValidPrefix = validPrefixes.some(prefix => address.startsWith(prefix));
  
  if (!hasValidPrefix) {
    return false;
  }
  
  // Additional checks for bech32 addresses
  if (address.startsWith('bc1') || address.startsWith('tb1')) {
    // Bech32 addresses should only contain lowercase letters and numbers
    if (!/^[a-z0-9]+$/.test(address)) {
      return false;
    }
    
    // Check length constraints for different bech32 types
    if (address.startsWith('bc1q') && address.length !== 42) {
      return false; // P2WPKH should be 42 characters
    }
    if (address.startsWith('bc1p') && address.length !== 62) {
      return false; // P2TR should be 62 characters
    }
  }
  
  return true;
};

export const getAddressBalance = async (address: string): Promise<number> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  // Validate address format first
  if (!isValidBitcoinAddress(address)) {
    console.warn('⚠️ Invalid Bitcoin address format:', address);
    return 0;
  }
  
  console.log(`💰 Fetching balance for address: ${address.substring(0, 10)}...`);
  
  // Always try real APIs - no mock data fallback
  const isConnected = await testNetworkConnectivity();
  if (!isConnected) {
    console.log('🔧 No network connection, returning 0 balance');
    return 0;
  }
  
  // Try multiple APIs for redundancy with different endpoints
  const apiAttempts = [
    { base: MEMPOOL_API, name: 'Mempool.space', endpoint: '/address' },
    { base: BLOCKSTREAM_API, name: 'Blockstream', endpoint: '/address' },
    { base: 'https://api.blockcypher.com/v1/btc/main', name: 'BlockCypher', endpoint: '/addrs' },
    { base: 'https://api.blockchain.info', name: 'Blockchain.info', endpoint: '/rawaddr' },
  ];
  
  let lastError: string | null = null;
  
  for (const api of apiAttempts) {
    try {
      console.log(`🔍 Trying ${api.name} for balance...`);
      
      const url = `${api.base}${api.endpoint}/${address}`;
      const data = await fetchWithRetry(url, {
        timeoutMs: 8000, // Reduced timeout
      }, 1); // Reduced retries for faster fallback
      
      const balance = normalizeBalanceResponse(data, api.name);
      console.log(`✅ Address balance fetched from ${api.name}:`, balance, 'BTC');
      return Math.max(0, balance); // Ensure non-negative balance
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      lastError = errorMsg;
      
      // Handle specific error cases
      if (errorMsg.includes('400')) {
        console.log(`ℹ️ ${api.name} returned 400 - trying next API`);
      } else if (errorMsg.includes('404')) {
        console.log(`ℹ️ ${api.name} returned 404 - address not found (new address):`, address);
        // 404 for new addresses is normal, return 0 balance
        return 0;
      } else {
        console.log(`ℹ️ ${api.name} unavailable - trying next API`);
      }
      continue;
    }
  }
  
  // Only log error if it's not a common network issue
  if (lastError && !lastError.includes('Failed to fetch') && !lastError.includes('NetworkError')) {
    console.warn('⚠️ All balance APIs failed, but this is normal during network issues');
  }
  
  console.log('🔧 Returning 0 balance (APIs temporarily unavailable)');
  return 0;
};

export const getWalletBalance = async (addresses: string[]): Promise<number> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  try {
    const balancePromises = addresses.map(address => getAddressBalance(address));
    const balances = await Promise.all(balancePromises);
    const totalBalance = balances.reduce((total, balance) => total + balance, 0);
    console.log('✅ Wallet balance calculated:', totalBalance, 'BTC');
    return totalBalance;
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    throw error;
  }
};

export const getAddressTransactions = async (address: string): Promise<any[]> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  // Validate address format first
  if (!isValidBitcoinAddress(address)) {
    console.warn('⚠️ Invalid Bitcoin address format:', address);
    return [];
  }
  
  console.log(`📜 Fetching transactions for address: ${address.substring(0, 10)}...`);
  
  // Always try real APIs - no mock data fallback
  const isConnected = await testNetworkConnectivity();
  if (!isConnected) {
    console.log('🔧 No network connection, returning empty transactions');
    return [];
  }
  
  // Try multiple APIs for redundancy with different endpoints
  const apiAttempts = [
    { base: MEMPOOL_API, name: 'Mempool.space', endpoint: '/address', suffix: '/txs' },
    { base: BLOCKSTREAM_API, name: 'Blockstream', endpoint: '/address', suffix: '/txs' },
    { base: 'https://api.blockcypher.com/v1/btc/main', name: 'BlockCypher', endpoint: '/addrs', suffix: '/full?limit=50' },
    { base: 'https://api.blockchain.info', name: 'Blockchain.info', endpoint: '/rawaddr', suffix: '' },
  ];
  
  let lastError: string | null = null;
  
  for (const api of apiAttempts) {
    try {
      console.log(`🔍 Trying ${api.name} for transactions...`);
      
      let url: string;
      if (api.name === 'Blockchain.info') {
        // Blockchain.info needs different URL format
        url = `${api.base}${api.endpoint}/${address}?format=json&limit=50`;
      } else {
        url = `${api.base}${api.endpoint}/${address}${api.suffix}`;
      }
      
      const data = await fetchWithRetry(url, {
        timeoutMs: 8000, // Reduced timeout
      }, 1); // Reduced retries for faster fallback
      
      const transactions = normalizeTransactionResponse(data, api.name);
      console.log(`✅ Address transactions fetched from ${api.name}:`, transactions.length, 'transactions');
      return transactions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      lastError = errorMsg;
      
      // Handle specific error cases
      if (errorMsg.includes('400')) {
        console.log(`ℹ️ ${api.name} returned 400 - trying next API`);
      } else if (errorMsg.includes('404')) {
        console.log(`ℹ️ ${api.name} returned 404 - no transactions found (new address):`, address);
        // 404 for new addresses is normal, return empty array
        return [];
      } else {
        console.log(`ℹ️ ${api.name} unavailable - trying next API`);
      }
      continue;
    }
  }
  
  // Only log error if it's not a common network issue
  if (lastError && !lastError.includes('Failed to fetch') && !lastError.includes('NetworkError')) {
    console.warn('⚠️ All transaction APIs failed, but this is normal during network issues');
  }
  
  console.log('🔧 Returning empty transactions (APIs temporarily unavailable)');
  return [];
};

export const getTransactionHistory = async (addresses: string[]): Promise<Transaction[]> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  try {
    const transactionPromises = addresses.map(address => getAddressTransactions(address));
    const addressTransactions = await Promise.all(transactionPromises);
    
    const allTransactions = addressTransactions.flat();
    const uniqueTransactions = new Map();
    
    // Remove duplicates and process transactions
    allTransactions.forEach(tx => {
      if (!uniqueTransactions.has(tx.txid)) {
        const isReceived = tx.vout && tx.vout.some((output: any) => 
          addresses.includes(output.scriptpubkey_address)
        );
        
        let amount = 0;
        if (isReceived && tx.vout) {
          amount = tx.vout.reduce((sum: number, output: any) => 
            addresses.includes(output.scriptpubkey_address) ? sum + (output.value || 0) : sum, 0) / 100000000;
        } else if (tx.vin) {
          amount = tx.vin.reduce((sum: number, input: any) => 
            addresses.includes(input.prevout?.scriptpubkey_address) ? sum + (input.prevout?.value || 0) : sum, 0) / 100000000;
        }
        
        const transaction: Transaction = {
          txid: tx.txid,
          type: isReceived ? 'received' : 'sent',
          amount: Math.abs(amount),
          amountUSD: 0, // Will be calculated with current price
          address: isReceived 
            ? (tx.vout?.find((output: any) => addresses.includes(output.scriptpubkey_address))?.scriptpubkey_address || addresses[0])
            : (tx.vin?.find((input: any) => addresses.includes(input.prevout?.scriptpubkey_address))?.prevout?.scriptpubkey_address || addresses[0]),
          timestamp: (tx.status?.block_time || Math.floor(Date.now() / 1000)) * 1000,
          confirmations: tx.status?.confirmed ? 6 : 0,
          status: tx.status?.confirmed ? 'confirmed' : 'pending',
        };
        
        uniqueTransactions.set(tx.txid, transaction);
      }
    });
    
    const processedTransactions = Array.from(uniqueTransactions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50); // Limit to 50 most recent transactions
    
    console.log('✅ Transaction history processed:', processedTransactions.length, 'transactions');
    return processedTransactions;
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    
    console.log('🔧 Error occurred, returning empty transaction history');
    return [];
  }
};

export const getAddressUTXOs = async (address: string): Promise<UTXO[]> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  try {
    const data = await fetchJSON(`${API_BASE}/address/${address}/utxo`, { timeoutMs: 15000 });
    return data as UTXO[];
  } catch (error) {
    console.error('Error fetching UTXOs:', error);
    return [];
  }
};

export const createTransaction = async (
  fromWallet: any,
  toAddress: string,
  amount: number, // in BTC
  feeRate: number, // sat/vB
  enableRBF: boolean = true
): Promise<{ txHex: string; fee: number; txid: string }> => {
  console.log('🔨 Creating Bitcoin transaction...');
  console.log('Parameters:', { toAddress, amount, feeRate, enableRBF });
  
  // Ensure ECC is initialized
  ensureECC();
  
  // Validate inputs
  if (!isValidBitcoinAddress(toAddress)) {
    throw new Error('Invalid recipient address');
  }
  
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  
  if (feeRate <= 0) {
    throw new Error('Fee rate must be greater than 0');
  }
  
  try {
    // For demo purposes, we'll create a mock transaction
    // In a real implementation, you would:
    // 1. Fetch UTXOs for the wallet
    // 2. Select appropriate UTXOs
    // 3. Create and sign the transaction
    // 4. Return the signed transaction hex
    
    console.log('📊 Fetching UTXOs for wallet addresses...');
    const utxos: UTXO[] = [];
    
    // Try to fetch real UTXOs
    for (const address of fromWallet.addresses) {
      try {
        const addressUTXOs = await getAddressUTXOs(address);
        utxos.push(...addressUTXOs);
      } catch (error) {
        console.warn(`Failed to fetch UTXOs for ${address}:`, error);
      }
    }
    
    console.log(`Found ${utxos.length} UTXOs`);
    
    // Convert amount from BTC to satoshis
    const amountSats = Math.floor(amount * 100000000);
    
    // For web platform or when no UTXOs available, create demo transaction
    if (Platform.OS === 'web' || utxos.length === 0) {
      const isWeb = Platform.OS === 'web';
      console.log(isWeb ? '🌐 Creating demo transaction (web platform - CORS limitations)' : '📱 Creating demo transaction (no UTXOs available)');
      
      if (isWeb) {
        console.log('⚠️ Web platform cannot broadcast real transactions due to CORS restrictions');
        console.log('📱 Use mobile app for real Bitcoin transactions');
      }
      
      // Estimate transaction size (1 input, 2 outputs)
      const estimatedSize = 250; // bytes
      const fee = Math.ceil(estimatedSize * feeRate);
      
      // Generate a mock transaction ID
      const mockTxId = generateMockTxId(toAddress + amount.toString(), Date.now(), Math.random());
      
      // Create a mock transaction hex (this would be a real signed transaction in production)
      const mockTxHex = generateMockTxHex(mockTxId, toAddress, amountSats, fee);
      
      console.log('✅ Demo transaction created:', {
        txid: mockTxId,
        fee: fee / 100000000, // Convert back to BTC
        size: estimatedSize,
        note: isWeb ? 'Demo only - no real Bitcoin sent' : 'Demo - no UTXOs available'
      });
      
      return {
        txHex: mockTxHex,
        fee: fee / 100000000, // Convert to BTC
        txid: mockTxId
      };
    }
    
    // Real transaction creation for mobile with UTXOs
    console.log('🔧 Creating REAL Bitcoin transaction with UTXOs for MAINNET broadcast...');
    console.log('⚠️ This will create a real, spendable Bitcoin transaction!');
    
    // Import required libraries
    const bitcoin = require('bitcoinjs-lib');
    const ecc = (global as any).ecc;
    
    if (!ecc) {
      throw new Error('ECC library not available');
    }
    
    // Initialize bitcoinjs-lib with ECC
    if (typeof bitcoin.initEccLib === 'function') {
      bitcoin.initEccLib(ecc);
    }
    
    // Select UTXOs using greedy algorithm
    const { UTXOSelector, TransactionSizeEstimator } = require('./fee-service');
    const selection = UTXOSelector.selectGreedy(
      utxos,
      amountSats,
      feeRate,
      fromWallet.addressType || 'p2wpkh'
    );
    
    console.log('UTXO selection:', {
      selectedUTXOs: selection.selectedUTXOs.length,
      fee: selection.fee,
      change: selection.change
    });
    
    // Create transaction builder
    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
    
    // Add inputs
    for (const utxo of selection.selectedUTXOs) {
      // For P2WPKH inputs, we need the previous transaction output
      try {
        const prevTxHex = await fetchTransaction(utxo.txid);
        const prevTx = bitcoin.Transaction.fromHex(prevTxHex);
        
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: prevTx.outs[utxo.vout].script,
            value: utxo.value,
          },
          sequence: enableRBF ? 0xfffffffd : 0xfffffffe, // Enable RBF if requested
        });
      } catch (error) {
        console.warn(`Failed to add input ${utxo.txid}:${utxo.vout}:`, error);
        throw new Error('Failed to prepare transaction inputs');
      }
    }
    
    // Add recipient output
    psbt.addOutput({
      address: toAddress,
      value: amountSats,
    });
    
    // Add change output if needed
    if (selection.change > 546) { // Dust threshold
      const changeAddress = fromWallet.addresses[fromWallet.currentAddressIndex];
      psbt.addOutput({
        address: changeAddress,
        value: selection.change,
      });
    }
    
    // Sign inputs
    const { getPrivateKey } = require('./wallet-service');
    
    for (let i = 0; i < selection.selectedUTXOs.length; i++) {
      const utxo = selection.selectedUTXOs[i];
      
      // Find which address index this UTXO belongs to
      const addressIndex = fromWallet.addresses.findIndex((addr: string) => addr === utxo.address);
      if (addressIndex === -1) {
        throw new Error(`Cannot find address index for UTXO ${utxo.txid}:${utxo.vout}`);
      }
      
      // Get private key for this address
      const privateKeyWIF = await getPrivateKey(fromWallet.mnemonic, addressIndex);
      const keyPair = bitcoin.ECPair.fromWIF(privateKeyWIF, bitcoin.networks.bitcoin);
      
      // Sign the input
      psbt.signInput(i, keyPair);
    }
    
    // Finalize and extract transaction
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();
    const txId = tx.getId();
    
    console.log('✅ REAL Bitcoin transaction created successfully:', {
      txid: txId,
      fee: selection.fee / 100000000,
      size: tx.byteLength(),
      network: 'MAINNET',
      ready_to_broadcast: true
    });
    
    return {
      txHex,
      fee: selection.fee / 100000000,
      txid: txId
    };
    
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to fetch transaction hex
const fetchTransaction = async (txid: string): Promise<string> => {
  try {
    const response = await fetch(`${BLOCKSTREAM_API}/tx/${txid}/hex`);
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
};

// Generate mock transaction ID for demo (web platform only)
const generateMockTxId = (input: string, timestamp: number, random: number): string => {
  const combinedInput = `${input}${timestamp}${random}`;
  let hash = 0;
  for (let i = 0; i < combinedInput.length; i++) {
    const char = combinedInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Convert to hex and pad to 64 characters (valid Bitcoin txid format)
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  const fullHash = (hexHash + hexHash + hexHash + hexHash + hexHash + hexHash + hexHash + hexHash).substring(0, 64);
  
  // Ensure it looks like a real Bitcoin transaction ID
  return fullHash.toLowerCase();
};

// Generate mock transaction hex for demo (web platform only)
const generateMockTxHex = (txid: string, toAddress: string, amount: number, fee: number): string => {
  // This is a simplified mock for demo purposes - real transaction hex is much more complex
  // This is only used on web platform where real transactions cannot be broadcast
  
  const version = '02000000'; // Version 2 (4 bytes)
  const inputCount = '01'; // 1 input (1 byte)
  const outputCount = '02'; // 2 outputs (1 byte) - recipient + change
  const locktime = '00000000'; // No locktime (4 bytes)
  
  // Mock input: previous tx hash (32 bytes) + output index (4 bytes) + script length + script + sequence (4 bytes)
  const mockPrevTxHash = txid.substring(0, 64); // Use part of txid as mock previous tx
  const mockOutputIndex = '00000000';
  const mockScriptLength = '6a'; // 106 bytes
  const mockScript = 'b'.repeat(212); // Mock script (106 bytes = 212 hex chars)
  const mockSequence = 'ffffffff';
  const mockInput = mockPrevTxHash + mockOutputIndex + mockScriptLength + mockScript + mockSequence;
  
  // Mock outputs: value (8 bytes) + script length + script
  const recipientValue = amount.toString(16).padStart(16, '0');
  const recipientScriptLength = '19'; // 25 bytes for P2WPKH
  const recipientScript = 'c'.repeat(50); // Mock recipient script
  const recipientOutput = recipientValue + recipientScriptLength + recipientScript;
  
  const changeValue = Math.max(0, 50000000 - amount - fee).toString(16).padStart(16, '0');
  const changeScriptLength = '19'; // 25 bytes for P2WPKH
  const changeScript = 'd'.repeat(50); // Mock change script
  const changeOutput = changeValue + changeScriptLength + changeScript;
  
  const mockTxHex = version + inputCount + mockInput + outputCount + recipientOutput + changeOutput + locktime;
  
  // Ensure minimum length for a valid-looking transaction
  return mockTxHex.padEnd(500, '0');
};

export const broadcastTransaction = async (txHex: string): Promise<string> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  console.log('📡 Broadcasting REAL Bitcoin transaction to MAINNET...');
  console.log('Transaction hex length:', txHex.length);
  
  // Validate transaction hex format
  if (!txHex || typeof txHex !== 'string' || txHex.length < 100) {
    throw new Error('Invalid transaction hex format');
  }
  
  // For web platform, we still need to simulate since CORS restrictions prevent direct broadcast
  if (Platform.OS === 'web') {
    console.log('🌐 Web platform detected - simulating broadcast (CORS limitations)');
    console.log('⚠️ Note: On web, transactions cannot be broadcast due to CORS restrictions');
    console.log('📱 Use mobile app for real Bitcoin transaction broadcasting');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Generate a realistic-looking transaction ID
    const mockTxId = generateMockTxId(txHex, Date.now(), Math.random());
    
    console.log('✅ Demo transaction broadcast simulated:', mockTxId);
    console.log('💡 This is a simulation - no real Bitcoin was sent');
    return mockTxId;
  }
  
  // Real transaction broadcasting for mobile platforms
  console.log('📱 Mobile platform - attempting REAL mainnet broadcast...');
  
  // Multiple broadcast endpoints for redundancy
  const broadcastEndpoints = [
    { 
      name: 'Blockstream', 
      url: `${BLOCKSTREAM_API}/tx`, 
      contentType: 'text/plain',
      timeout: 30000 // 30 seconds
    },
    { 
      name: 'Mempool.space', 
      url: `${MEMPOOL_API}/tx`, 
      contentType: 'text/plain',
      timeout: 30000
    },
    {
      name: 'BlockCypher',
      url: 'https://api.blockcypher.com/v1/btc/main/txs/push',
      contentType: 'application/json',
      timeout: 30000,
      formatBody: (hex: string) => JSON.stringify({ tx: hex })
    }
  ];
  
  let lastError: Error | null = null;
  let successfulBroadcast = false;
  
  for (const endpoint of broadcastEndpoints) {
    try {
      console.log(`🔍 Attempting REAL broadcast via ${endpoint.name}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);
      
      const requestBody = endpoint.formatBody ? endpoint.formatBody(txHex) : txHex;
      
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': endpoint.contentType,
          'User-Agent': 'BitcoinWallet/1.0',
          'Accept': 'text/plain, application/json',
        },
        body: requestBody,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`❌ ${endpoint.name} returned ${response.status}:`, errorText);
        
        // Parse specific error messages
        if (errorText.includes('dust') || errorText.includes('too-small')) {
          throw new Error('Transaction output too small (dust limit)');
        }
        if (errorText.includes('fee') || errorText.includes('insufficient')) {
          throw new Error('Transaction fee too low or insufficient funds');
        }
        if (errorText.includes('already') || errorText.includes('duplicate')) {
          throw new Error('Transaction already exists in mempool');
        }
        if (errorText.includes('invalid') || errorText.includes('malformed')) {
          throw new Error('Invalid transaction format');
        }
        
        throw new Error(`Broadcast failed: ${errorText}`);
      }
      
      let txid: string;
      const responseText = await response.text();
      
      // Handle different response formats
      if (endpoint.name === 'BlockCypher') {
        try {
          const jsonResponse = JSON.parse(responseText);
          txid = jsonResponse.tx?.hash || jsonResponse.hash;
        } catch {
          txid = responseText.trim();
        }
      } else {
        txid = responseText.trim();
      }
      
      // Validate transaction ID format
      if (!txid || txid.length !== 64 || !/^[a-fA-F0-9]{64}$/.test(txid)) {
        console.warn(`⚠️ Invalid txid format from ${endpoint.name}:`, txid);
        throw new Error('Invalid transaction ID returned');
      }
      
      console.log(`✅ REAL Bitcoin transaction broadcast successful via ${endpoint.name}!`);
      console.log(`🎉 Transaction ID: ${txid}`);
      console.log(`🔗 View on blockchain: https://mempool.space/tx/${txid}`);
      
      successfulBroadcast = true;
      return txid;
      
    } catch (error) {
      lastError = error as Error;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      console.warn(`❌ Broadcast failed via ${endpoint.name}:`, errorMsg);
      
      // If it's a transaction-specific error (not network), don't try other endpoints
      if (errorMsg.includes('dust') || 
          errorMsg.includes('fee') || 
          errorMsg.includes('insufficient') ||
          errorMsg.includes('already exists') ||
          errorMsg.includes('invalid')) {
        throw error;
      }
      
      continue;
    }
  }
  
  // All endpoints failed
  if (!successfulBroadcast) {
    console.error('❌ All broadcast endpoints failed for REAL transaction');
    const errorMessage = lastError?.message || 'All broadcast endpoints unavailable';
    
    // Provide helpful error messages
    if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
      throw new Error('Network error: Please check your internet connection and try again.');
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
      throw new Error('Request timeout: The Bitcoin network may be congested. Please try again.');
    }
    
    throw new Error(`Failed to broadcast transaction: ${errorMessage}`);
  }
  
  // This should never be reached, but TypeScript requires it
  throw new Error('Unexpected error in transaction broadcast');
};

// Send transaction function that combines creation and broadcasting
export const sendTransaction = async (
  fromWallet: any,
  toAddress: string,
  amount: number, // in BTC
  feeRate: number, // sat/vB
  enableRBF: boolean = true
): Promise<{ txid: string; fee: number }> => {
  console.log('💸 Sending REAL Bitcoin transaction on MAINNET...');
  console.log('🚨 WARNING: This will spend real Bitcoin!');
  
  // Final validation before creating transaction
  if (!fromWallet || !fromWallet.addresses || fromWallet.addresses.length === 0) {
    throw new Error('Invalid wallet: No addresses available');
  }
  
  if (!isValidBitcoinAddress(toAddress)) {
    throw new Error('Invalid recipient Bitcoin address');
  }
  
  if (amount <= 0 || amount > 21000000) { // Max 21M BTC
    throw new Error('Invalid amount: Must be between 0 and 21,000,000 BTC');
  }
  
  if (feeRate <= 0 || feeRate > 1000) { // Reasonable fee rate limits
    throw new Error('Invalid fee rate: Must be between 1 and 1000 sat/vB');
  }
  
  try {
    console.log('📋 Transaction details:', {
      from_wallet: fromWallet.name,
      to_address: toAddress.substring(0, 20) + '...',
      amount_btc: amount,
      fee_rate: feeRate + ' sat/vB',
      rbf_enabled: enableRBF,
      network: 'MAINNET'
    });
    
    // Step 1: Create the transaction
    console.log('🔨 Step 1: Creating transaction...');
    const { txHex, fee, txid: createdTxId } = await createTransaction(
      fromWallet,
      toAddress,
      amount,
      feeRate,
      enableRBF
    );
    
    console.log('✅ Transaction created successfully');
    console.log('📡 Step 2: Broadcasting to Bitcoin network...');
    
    // Step 2: Broadcast the transaction to the Bitcoin network
    const broadcastTxId = await broadcastTransaction(txHex);
    
    // Use the broadcast txid if available, otherwise use the created one
    const finalTxId = broadcastTxId || createdTxId;
    
    const isRealTransaction = Platform.OS !== 'web';
    
    console.log('🎉 Transaction processing completed:', {
      txid: finalTxId,
      fee_btc: fee,
      amount_btc: amount,
      network: 'MAINNET',
      real_transaction: isRealTransaction,
      blockchain_url: `https://mempool.space/tx/${finalTxId}`
    });
    
    if (isRealTransaction) {
      console.log('✅ REAL Bitcoin transaction successfully broadcast to MAINNET!');
      console.log('🔗 Track your transaction: https://mempool.space/tx/' + finalTxId);
    } else {
      console.log('🌐 Demo transaction created (web platform)');
    }
    
    return {
      txid: finalTxId,
      fee
    };
    
  } catch (error) {
    console.error('❌ Error sending Bitcoin transaction:', error);
    
    // Enhance error messages for better user experience
    if (error instanceof Error) {
      if (error.message.includes('Insufficient funds')) {
        throw new Error('Insufficient funds: You don\'t have enough Bitcoin to complete this transaction including fees.');
      }
      if (error.message.includes('dust')) {
        throw new Error('Amount too small: Bitcoin network requires a minimum amount to prevent spam.');
      }
      if (error.message.includes('fee')) {
        throw new Error('Fee issue: ' + error.message + ' Try increasing the fee rate.');
      }
      if (error.message.includes('network') || error.message.includes('connection')) {
        throw new Error('Network error: Unable to connect to Bitcoin network. Please check your internet connection.');
      }
    }
    
    throw error;
  }
};