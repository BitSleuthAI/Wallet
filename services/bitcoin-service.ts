/**
 * Simplified Bitcoin Service - Only Essential Functions
 * Most functionality moved to esplora-service.ts and wallet-service.ts
 */

import { BitcoinPrice, UTXO } from '@/types/wallet';
import { loadBip32Module } from './bip32-loader';

// Use centralized bip32 loader
let bip32: any = null;

// Don't initialize ECC at module load time - do it lazily when needed
let eccInitialized = false;

export const ensureECC = async () => {
  console.log('🔧 ensureECC called, eccInitialized:', eccInitialized);
  
  // Always check if ECC is actually available, even if flag says it's initialized
  const eccCheck = (global as any).ecc;
  
  if (eccInitialized && eccCheck) {
    console.log('✅ ECC already initialized and available, returning');
    return;
  }
  
  if (eccInitialized && !eccCheck) {
    console.warn('⚠️ eccInitialized flag is true but ECC not found, reinitializing...');
    eccInitialized = false;
  }
  
  try {
    console.log('🔧 Loading crypto-polyfill...');
    const { initializeCrypto } = require('./crypto-polyfill');
    
    console.log('🔧 Calling initializeCrypto...');
    const success = await initializeCrypto();
    
    console.log('🔧 initializeCrypto result:', success);
    
    if (!success) {
      throw new Error('Cryptographic library initialization failed');
    }
    
    // Poll for ECC availability with exponential backoff
    console.log('🔧 Polling for global ECC availability...');
    let ecc = (global as any).ecc;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!ecc && attempts < maxAttempts) {
      const delay = Math.min(10 * Math.pow(2, attempts), 100); // Exponential backoff: 10, 20, 40, 80, 100ms
      console.log(`🔧 ECC not yet available, waiting ${delay}ms (attempt ${attempts + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      ecc = (global as any).ecc;
      attempts++;
    }
    
    console.log('🔧 Checking global ECC...');
    console.log('🔧 Global ECC:', typeof ecc, ecc ? Object.keys(ecc) : 'null');
    
    if (!ecc) {
      console.error('❌ ECC not found on global after initialization');
      console.error('❌ Global keys:', Object.keys(global).filter(k => k.includes('ecc') || k.includes('crypto') || k.startsWith('__')));
      throw new Error('ECC library not available after initialization');
    }
    
    console.log('🔧 Loading bitcoinjs-lib...');
    try {
      // Try different import methods for React Native
      let bitcoin;
      try {
        bitcoin = require('bitcoinjs-lib');
      } catch (requireError) {
        console.log('⚠️ require() failed, trying dynamic import...');
        // For React Native, we might need to skip bitcoinjs-lib initialization
        // since it may not be fully compatible
        console.log('⚠️ Skipping bitcoinjs-lib initialization in React Native');
        eccInitialized = true;
        console.log('✅ ensureECC completed successfully (without bitcoinjs-lib)');
        return;
      }
      
      console.log('🔧 BitcoinJS loaded successfully');
      
      // Initialize BitcoinJS with our ECC implementation
      console.log('🔧 Initializing BitcoinJS with ECC...');
      bitcoin.initEccLib(ecc);
      
      console.log('✅ BitcoinJS initialized with ECC');
    } catch (bitcoinError) {
      console.warn('⚠️ BitcoinJS initialization failed, continuing without it:', bitcoinError);
      // Don't throw here - we can still use ECC for other purposes
    }
    
    eccInitialized = true;
    console.log('✅ ensureECC completed successfully');
  } catch (error) {
    console.error('❌ ensureECC failed:', error);
    throw error;
  }
};

/**
 * Validate Bitcoin address format
 */
export const isValidBitcoinAddress = (address: string): boolean => {
  try {
    // Basic validation for bech32 addresses (P2WPKH)
    if (address.startsWith('bc1q') && address.length === 42) {
      return true;
    }
    
    // Basic validation for legacy addresses (P2PKH)
    if (address.startsWith('1') && address.length >= 26 && address.length <= 35) {
      return true;
    }
    
    // Basic validation for P2SH addresses
    if (address.startsWith('3') && address.length >= 26 && address.length <= 35) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Address validation failed:', error);
    return false;
  }
};

/**
 * Get UTXOs for an address (still needed by coin-control and send screens)
 */
export const getAddressUTXOs = async (address: string, addressIndex?: number): Promise<UTXO[]> => {
  try {
    console.log('🔍 Fetching UTXOs (cached) for address:', address.substring(0, 10) + '...');
    const { getAddressUTXOs: esploraGetAddressUTXOs } = await import('./esplora-service');
    const result = await esploraGetAddressUTXOs(address);
    if (result.error) {
      console.error('❌ Esplora service error:', result.error);
      throw new Error(result.error);
    }
    const data = result.data || [];
    console.log('🔍 Raw UTXOs from esplora service:', data.length);
    
    // If we get empty results, try direct API call as fallback
    if (data.length === 0) {
      console.log('🔄 Empty UTXOs from cached service, trying direct API call...');
      try {
        const directResult = await fetchDirectUTXOs(address);
        if (directResult.length > 0) {
          console.log('✅ Direct API call found', directResult.length, 'UTXOs');
          return directResult.map((utxo: any) => ({
            txid: utxo.txid,
            vout: utxo.vout,
            value: utxo.value,
            scriptPubKey: utxo.scriptpubkey,
            address: utxo.status?.confirmed ? address : undefined,
            addressIndex: addressIndex,
            status: {
              confirmed: utxo.status?.confirmed || false,
              block_height: utxo.status?.block_height,
              block_hash: utxo.status?.block_hash,
              block_time: utxo.status?.block_time,
            },
          }));
        }
      } catch (directError) {
        console.warn('⚠️ Direct API call also failed:', directError);
      }
    }
    
    const utxos: UTXO[] = data.map((utxo: any) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value,
      scriptPubKey: utxo.scriptpubkey,
      address: utxo.status?.confirmed ? address : undefined,
      addressIndex: addressIndex,
      status: {
        confirmed: utxo.status?.confirmed || false,
        block_height: utxo.status?.block_height,
        block_hash: utxo.status?.block_hash,
        block_time: utxo.status?.block_time,
      },
    }));
    console.log('✅ UTXOs fetched from esplora-service cache-aware layer:', utxos.length);
    return utxos;
  } catch (error) {
    console.error('❌ getAddressUTXOs failed:', error);
    throw error;
  }
};

// Direct API call bypassing all caching
async function fetchDirectUTXOs(address: string): Promise<any[]> {
  try {
    console.log('🌐 Direct API call for UTXOs:', address.substring(0, 10) + '...');
    const response = await fetch(`https://blockstream.info/api/address/${address}/utxo`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('🌐 Direct API response:', Array.isArray(data) ? data.length : 'not array');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Direct API call failed:', error);
    throw error;
  }
}

/**
 * Get Bitcoin price using the improved esplora service with multiple fallbacks
 */
export const getBitcoinPrice = async (): Promise<BitcoinPrice> => {
  try {
    console.log('💲 Fetching Bitcoin price using esplora service...');
    
    // Use the improved esplora service with multiple fallbacks
    const { getBTCPrice } = require('./esplora-service');
    const result = await getBTCPrice();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.data) {
      throw new Error('No price data received');
    }
    
    console.log('✅ Bitcoin price fetched:', result.data.price);
    
    return {
      usd: result.data.price,
      usd_24h_change: result.data.change24h,
    };
  } catch (error) {
    console.error('❌ getBitcoinPrice failed:', error);
    throw error;
  }
};

/**
 * Send transaction using Blockstream API
 */
export const sendTransaction = async (
  fromAddress: string,
  toAddress: string,
  amount: number,
  feeRate: number = 10,
  mnemonic: string,
  addressIndex: number,
  enableRBF?: boolean,
  selectedUTXOs?: UTXO[],
  allWalletAddresses?: string[]
): Promise<{ txid: string; fee: number; amount: number }> => {
  try {
    console.log('🔍 sendTransaction: Received selectedUTXOs.length:', selectedUTXOs ? selectedUTXOs.length : 'null/undefined');
    console.log('🔍 sendTransaction: Received allWalletAddresses.length:', allWalletAddresses ? allWalletAddresses.length : 'null/undefined');
    console.log('🔍 sendTransaction: selectedUTXOs details:', selectedUTXOs ? selectedUTXOs.map(u => ({
      txid: u.txid.substring(0, 10) + '...',
      vout: u.vout,
      value: u.value,
      address: u.address?.substring(0, 10) + '...',
      addressIndex: u.addressIndex,
      frozen: u.frozen
    })) : 'null/undefined');
    console.log('📤 Sending transaction...');
    console.log('From:', fromAddress.substring(0, 10) + '...');
    console.log('To:', toAddress.substring(0, 10) + '...');
    console.log('Amount:', amount, 'BTC');
    console.log('Fee rate:', feeRate, 'sat/vB');
    
    // Ensure ECC is initialized
    await ensureECC();
    
    // Validate inputs
    if (!isValidBitcoinAddress(fromAddress)) {
      throw new Error('Invalid from address');
    }
    if (!isValidBitcoinAddress(toAddress)) {
      throw new Error('Invalid to address');
    }
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    if (feeRate <= 0) {
      throw new Error('Fee rate must be positive');
    }
    if (!mnemonic || mnemonic.trim() === '') {
      throw new Error('Mnemonic is required for transaction signing');
    }
    if (addressIndex < 0) {
      throw new Error('Address index must be non-negative');
    }
    
    // Convert amount to satoshis
    const amountSatoshis = Math.floor(amount * 1e8);
    
    let utxosToUse: UTXO[] = [];
    let actualFee: number;
    
    if (selectedUTXOs && selectedUTXOs.length > 0) {
      // Use pre-selected UTXOs (from coin control or pre-loaded from send screen)
      console.log('🔍 Using pre-selected UTXOs:', selectedUTXOs.length);
      console.log('🔍 Sample pre-selected UTXO:', selectedUTXOs[0] ? {
        txid: selectedUTXOs[0].txid.substring(0, 10) + '...',
        vout: selectedUTXOs[0].vout,
        value: selectedUTXOs[0].value,
        address: selectedUTXOs[0].address?.substring(0, 10) + '...',
        frozen: selectedUTXOs[0].frozen,
        status: selectedUTXOs[0].status
      } : 'No UTXOs');
      
      // Log all UTXO statuses for debugging
      console.log('🔍 All UTXO statuses:', selectedUTXOs.map(u => ({
        txid: u.txid.substring(0, 10) + '...',
        vout: u.vout,
        status: u.status,
        frozen: u.frozen
      })));
      
      // Filter out frozen UTXOs and ensure we have confirmed UTXOs
      // CRITICAL: Must exclude frozen UTXOs to prevent using locked coins
      // Use optional chaining to safely access status.confirmed
      const confirmedUtxos = selectedUTXOs.filter(utxo => utxo.status?.confirmed === true);
      const unfrozenUtxos = confirmedUtxos.filter(utxo => !utxo.frozen);
      
      console.log('🔍 Confirmed UTXOs:', confirmedUtxos.length);
      console.log('🔍 Frozen UTXOs filtered out:', confirmedUtxos.length - unfrozenUtxos.length);
      console.log('🔍 Unfrozen confirmed UTXOs:', unfrozenUtxos.length);
      
      utxosToUse = unfrozenUtxos;
      
      if (utxosToUse.length === 0) {
        console.warn('⚠️ No confirmed unfrozen UTXOs in pre-selected set');
        // Fall through to error handling below
      } else {
        console.log('✅ Using pre-selected confirmed unfrozen UTXOs:', utxosToUse.length);
      }
    }
    
    // If we don't have UTXOs from pre-selection, we cannot proceed
    if (!utxosToUse || utxosToUse.length === 0) {
      console.log('⚠️ sendTransaction: No UTXOs available for transaction');
      console.log('⚠️ sendTransaction: utxosToUse:', utxosToUse);
      console.log('⚠️ sendTransaction: selectedUTXOs:', selectedUTXOs);
      
      // Provide specific error messages based on the situation
      if (selectedUTXOs && selectedUTXOs.length > 0) {
        const allFrozen = selectedUTXOs.every(utxo => utxo.frozen);
        const allUnconfirmed = selectedUTXOs.every(utxo => utxo.status?.confirmed !== true);
        
        if (allFrozen) {
          throw new Error('All selected UTXOs are frozen. Please unfreeze some UTXOs or select different ones.');
        } else if (allUnconfirmed) {
          throw new Error('All selected UTXOs are unconfirmed. Please wait for confirmations or select confirmed UTXOs.');
        } else {
          throw new Error('No confirmed, unfrozen UTXOs available in selection. Please check your coin control settings.');
        }
      } else {
        throw new Error('No UTXOs available for transaction. Please ensure UTXOs are loaded in the wallet.');
      }
    }
    
    console.log('✅ sendTransaction: Using', utxosToUse.length, 'UTXOs for transaction');
    console.log('✅ sendTransaction: UTXOs to use details:', utxosToUse.map(u => ({
      txid: u.txid.substring(0, 10) + '...',
      vout: u.vout,
      value: u.value,
      address: u.address?.substring(0, 10) + '...',
      addressIndex: u.addressIndex,
      frozen: u.frozen
    })));
    
    // Calculate fee based on pre-selected UTXOs
    const totalInputValue = utxosToUse.reduce((sum, utxo) => sum + utxo.value, 0);
    
    // Calculate change amount first
    const tempFee = Math.ceil(estimateTransactionSize(utxosToUse.length, 2) * feeRate);
    const tempChange = totalInputValue - amountSatoshis - tempFee;
    
    // Calculate actual output count based on change amount
    const actualOutputCount = calculateOutputCount(tempChange);
    
    // Recalculate fee with accurate output count
    const estimatedSize = estimateTransactionSize(utxosToUse.length, actualOutputCount);
    actualFee = Math.ceil(estimatedSize * feeRate);
    const totalNeeded = amountSatoshis + actualFee;
    
    if (totalInputValue < totalNeeded) {
      throw new Error('Insufficient funds in selected UTXOs');
    }
    
    console.log('✅ Using pre-selected UTXOs:', utxosToUse.length);
    
    // Create transaction
    console.log('🔧 Creating transaction...');
    const transaction = await createTransaction(
      utxosToUse,
      toAddress,
      amountSatoshis,
      actualFee,
      feeRate,
      mnemonic,
      addressIndex,
      enableRBF
    );
    
    // Broadcast transaction
    console.log('📡 Broadcasting transaction...');
    const txid = await broadcastTransaction(transaction);
    
    console.log('✅ Transaction sent successfully:', txid);
    return {
      txid,
      fee: actualFee / 1e8, // Convert back to BTC
      amount: amountSatoshis / 1e8 // Convert back to BTC
    };
  } catch (error) {
    console.error('❌ sendTransaction failed:', error);
    throw error;
  }
};

/**
 * Select UTXOs for transaction using greedy algorithm
 */
function selectUTXOs(utxos: UTXO[], targetAmount: number, feeRate: number): {
  selectedUTXOs: UTXO[];
  fee: number;
  change: number;
} {
  // Filter confirmed UTXOs and sort by value (largest first)
  // Use optional chaining to safely access status.confirmed
  const availableUTXOs = utxos
    .filter(utxo => utxo.status?.confirmed === true)
    .sort((a, b) => b.value - a.value);
  
  if (availableUTXOs.length === 0) {
    throw new Error('No confirmed UTXOs available');
  }
  
  const selectedUTXOs: UTXO[] = [];
  let totalSelected = 0;
  
  // Greedy selection algorithm
  for (const utxo of availableUTXOs) {
    selectedUTXOs.push(utxo);
    totalSelected += utxo.value;
    
    // Calculate change amount first
    const tempFee = Math.ceil(estimateTransactionSize(selectedUTXOs.length, 2) * feeRate);
    const tempChange = totalSelected - targetAmount - tempFee;
    
    // Calculate actual output count based on change amount
    const actualOutputCount = calculateOutputCount(tempChange);
    
    // Recalculate fee with accurate output count
    const estimatedSize = estimateTransactionSize(selectedUTXOs.length, actualOutputCount);
    const fee = Math.ceil(estimatedSize * feeRate);
    const totalNeeded = targetAmount + fee;
    
    if (totalSelected >= totalNeeded) {
      const change = totalSelected - totalNeeded;
      return { selectedUTXOs, fee, change };
    }
  }
  
  throw new Error('Insufficient funds');
}

/**
 * Calculate the actual number of outputs based on change amount and dust threshold
 */
function calculateOutputCount(changeAmount: number): number {
  // Always have at least 1 output (recipient)
  let outputCount = 1;
  
  // Add change output only if it exceeds dust threshold (546 satoshis)
  if (changeAmount > 546) {
    outputCount = 2; // recipient + change
  }
  
  return outputCount;
}

/**
 * Estimate transaction size in bytes
 */
function estimateTransactionSize(inputCount: number, outputCount: number): number {
  // Base transaction size
  let size = 10; // version (4) + input count (1) + output count (1) + locktime (4)
  
  // P2WPKH input size (68 bytes each)
  size += inputCount * 68;
  
  // P2WPKH output size (34 bytes each)
  size += outputCount * 34;
  
  return size;
}

/**
 * Generate a change address using the wallet's derivation path
 */
async function generateChangeAddress(mnemonic: string, changeIndex: number = 0): Promise<string> {
  try {
    console.log('🔧 Generating change address for index:', changeIndex);
    
    // Ensure bip32 module is loaded
    if (!bip32) {
      bip32 = await loadBip32Module();
    }
    
    if (!bip32 || !bip32.BIP32Factory) {
      throw new Error('BIP32 module or BIP32Factory not available');
    }
    const bip39 = require('bip39');
    const ecc = (global as any).ecc;
    const bip32Instance = bip32.BIP32Factory(ecc);
    
    // Derive private key for change address (chain 1)
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32Instance.fromSeed(seed);
    const child = root.derive(`m/84'/0'/0'/1/${changeIndex}`);
    
    if (!child.publicKey) {
      throw new Error('Failed to derive public key for change address');
    }
    
    // Generate P2WPKH address
    const bech32 = await import('bech32');
    const { sha256 } = await import('@noble/hashes/sha256');
    const { ripemd160 } = await import('@noble/hashes/ripemd160');
    
    const sha256Hash = sha256(child.publicKey);
    const hash160 = ripemd160(sha256Hash);
    const words = bech32.bech32.toWords(hash160);
    const address = bech32.bech32.encode('bc', [0, ...words]);
    
    console.log('✅ Generated change address:', address);
    return address;
  } catch (error) {
    console.error('❌ Failed to generate change address:', error);
    throw error;
  }
}

/**
 * Create and sign transaction
 */
async function createTransaction(
  utxos: UTXO[],
  toAddress: string,
  amountSatoshis: number,
  feeAmount: number,
  feeRate: number,
  mnemonic: string,
  addressIndex: number,
  enableRBF?: boolean
): Promise<string> {
  try {
    console.log('🔧 Creating transaction with', utxos.length, 'inputs');
    
    // Import required libraries
    const bitcoin = require('bitcoinjs-lib');
    const ecc = (global as any).ecc;
    
    if (!ecc) {
      throw new Error('ECC library not available');
    }
    
    // Validate ECC library before using it
    console.log('🔧 Validating ECC library before bitcoinjs-lib initialization...');
    
    // Test basic ECC functionality
    const testPrivateKey = new Uint8Array(32);
    testPrivateKey[31] = 1; // Set to 1 to ensure it's a valid private key
    
    try {
      // Test private key validation
      if (!ecc.isPrivate(testPrivateKey)) {
        throw new Error('ECC private key validation failed');
      }
      
      // Test point generation
      const publicKey = ecc.pointFromScalar(testPrivateKey, true);
      if (!publicKey || publicKey.length !== 33) {
        throw new Error('ECC point generation failed');
      }
      
      // Test signing and verification
      const testHash = new Uint8Array(32);
      testHash.fill(0xaa); // Fill with test data
      
      const signature = ecc.sign(testHash, testPrivateKey);
      if (!signature || signature.length === 0) {
        throw new Error('ECC signing failed');
      }
      
      const isValid = ecc.verify(testHash, publicKey, signature);
      if (!isValid) {
        throw new Error('ECC signature verification failed');
      }
      
      console.log('✅ ECC library validation passed');
    } catch (eccError) {
      console.error('❌ ECC library validation failed:', eccError);
      throw new Error(`ECC library invalid: ${eccError instanceof Error ? eccError.message : 'Unknown error'}`);
    }
    
    // Initialize bitcoinjs-lib with ECC
    try {
      console.log('🔧 Initializing bitcoinjs-lib with ECC...');
      console.log('🔧 ECC object keys:', Object.keys(ecc));
      console.log('🔧 ECC object type:', typeof ecc);
      
      // Check if bitcoinjs-lib has the initEccLib method
      if (typeof bitcoin.initEccLib !== 'function') {
        throw new Error('bitcoinjs-lib.initEccLib is not a function');
      }
      
      // No arbitrary delay; rely on synchronous/asynchronous initEccLib
      
      console.log('🔧 Calling bitcoin.initEccLib...');
      const initResult = bitcoin.initEccLib(ecc);
      if (initResult instanceof Promise) {
        await initResult;
      }
      
      // Verify the initialization worked by checking if ECC is properly set
      console.log('🔧 Verifying ECC initialization...');
      
      // Check that bitcoin.ECPair is available after initialization
      if (!bitcoin.ECPair) {
        throw new Error('ECC initialization failed: bitcoin.ECPair is not available');
      }
      
      // Log what's available on the bitcoin object for debugging
      console.log('🔧 Available bitcoin object keys:', Object.keys(bitcoin));
      console.log('🔧 bitcoin.ECPair:', typeof bitcoin.ECPair, bitcoin.ECPair);
      
      // In bitcoinjs-lib 7.0.0, ECPair might not be directly available
      // Let's check if we can access it through other means
      let ECPair = bitcoin.ECPair;
      
      // Try alternative ways to access ECPair in bitcoinjs-lib 7.0.0
      if (!ECPair) {
        console.log('🔧 ECPair not directly available, trying alternative access methods...');
        
        // Try accessing through bitcoin.ECPair or bitcoin.ECPairFactory
        if (bitcoin.ECPairFactory) {
          console.log('🔧 Found ECPairFactory, using it');
          ECPair = bitcoin.ECPairFactory(ecc);
        } else if (bitcoin.ECPair) {
          console.log('🔧 Found ECPair directly');
          ECPair = bitcoin.ECPair;
        } else {
          // Try to create ECPair manually using the ECC library
          console.log('🔧 Creating ECPair manually using ECC library...');
          try {
            const testPrivateKey = new Uint8Array(32);
            testPrivateKey[31] = 1;
            
            // Test if our ECC library can create a public key
            const publicKey = ecc.pointFromScalar(testPrivateKey, true);
            if (publicKey && publicKey.length === 33) {
              console.log('✅ ECC library can create public keys - ECC initialization successful');
              // Skip ECPair verification and proceed
            } else {
              throw new Error('ECC library cannot create valid public keys');
            }
          } catch (eccTestError) {
            console.error('❌ ECC library test failed:', eccTestError);
            throw new Error('ECC library not working properly after bitcoinjs-lib initialization');
          }
        }
      }
      
      // If we found ECPair, test it
      if (ECPair) {
        try {
          const testPrivateKey = new Uint8Array(32);
          testPrivateKey[31] = 1;
          
          const testECPair = ECPair.fromPrivateKey(testPrivateKey);
          if (!testECPair || !testECPair.publicKey) {
            throw new Error('ECPair creation failed');
          }
          
          console.log('✅ ECC initialization verified - ECPair creation successful');
        } catch (verifyError) {
          console.error('❌ ECPair verification failed:', verifyError);
          throw new Error('bitcoinjs-lib ECC initialization verification failed');
        }
      }
      
      console.log('✅ bitcoinjs-lib initialized with ECC successfully');
    } catch (initError) {
      console.error('❌ Failed to initialize bitcoinjs-lib with ECC:', initError);
      console.error('❌ Error type:', typeof initError);
      console.error('❌ Error message:', initError instanceof Error ? initError.message : 'Unknown error');
      console.error('❌ Error stack:', initError instanceof Error ? initError.stack : 'No stack');
      throw new Error(`Failed to initialize bitcoinjs-lib: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
    }
    
    // Create transaction builder
    console.log('🔧 Creating PSBT (bitcoinjs-lib 7.0.0+ approach)...');
    console.log('🔧 Available bitcoin object keys:', Object.keys(bitcoin));
    console.log('🔧 bitcoin.networks:', typeof bitcoin.networks, bitcoin.networks);
    
    let txb;
    try {
      // Check if TransactionBuilder is available
      if (!bitcoin.TransactionBuilder) {
        console.error('❌ bitcoin.TransactionBuilder is not available');
        console.error('❌ Available bitcoin methods:', Object.keys(bitcoin));
        throw new Error('TransactionBuilder not available in bitcoinjs-lib');
      }
      
      // Check if networks is available
      if (!bitcoin.networks) {
        console.error('❌ bitcoin.networks is not available');
        throw new Error('bitcoin.networks not available');
      }
      
      if (!bitcoin.networks.bitcoin) {
        console.error('❌ bitcoin.networks.bitcoin is not available');
        console.error('❌ Available networks:', Object.keys(bitcoin.networks));
        throw new Error('bitcoin.networks.bitcoin not available');
      }
      
      console.log('🔧 Creating TransactionBuilder with bitcoin network...');
      txb = new bitcoin.TransactionBuilder(bitcoin.networks.bitcoin);
      console.log('✅ TransactionBuilder created successfully');
    } catch (txbError) {
      console.error('❌ Failed to create TransactionBuilder:', txbError);
      console.error('❌ Error type:', typeof txbError);
      console.error('❌ Error message:', txbError instanceof Error ? txbError.message : 'Unknown error');
      console.error('❌ Error stack:', txbError instanceof Error ? txbError.stack : 'No stack');
      
      // Try alternative approach - use PSBT instead of TransactionBuilder
      console.log('🔧 TransactionBuilder failed, trying PSBT approach...');
      try {
        // In bitcoinjs-lib 7.0.0, we need to use PSBT instead of TransactionBuilder
        if (bitcoin.Psbt) {
          console.log('🔧 Using PSBT instead of TransactionBuilder...');
          // Create PSBT instance
          txb = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
          console.log('✅ PSBT created successfully');
        } else {
          throw new Error('Neither TransactionBuilder nor PSBT available');
        }
      } catch (psbtError) {
        console.error('❌ PSBT approach also failed:', psbtError);
        throw new Error(`Failed to create TransactionBuilder: ${txbError instanceof Error ? txbError.message : 'Unknown error'}`);
      }
    }
    
    // Calculate total input value and change
    const totalInputValue = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    const changeAmount = totalInputValue - amountSatoshis - feeAmount;
    
    // Check if we're using PSBT or TransactionBuilder
    const isPSBT = txb instanceof bitcoin.Psbt;
    console.log('🔧 Using transaction type:', isPSBT ? 'PSBT' : 'TransactionBuilder');
    
    if (isPSBT) {
      // PSBT approach for bitcoinjs-lib 7.0.0
      console.log('🔧 Adding inputs to PSBT...');
      
      // Add inputs to PSBT
      for (const utxo of utxos) {
        console.log(`🔧 Processing UTXO: ${utxo.txid.substring(0, 8)}...:${utxo.vout}`);
        console.log(`🔧 UTXO data:`, {
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          scriptPubKey: utxo.scriptPubKey,
          address: utxo.address,
          addressIndex: utxo.addressIndex
        });
        
        // Check if scriptPubKey is available, generate it if missing
        let scriptPubKey = utxo.scriptPubKey;
        if (!scriptPubKey) {
          console.log(`🔧 UTXO missing scriptPubKey, generating from address: ${utxo.address}`);
          
          if (!utxo.address) {
            console.error('❌ UTXO missing both scriptPubKey and address:', utxo);
            throw new Error(`UTXO ${utxo.txid}:${utxo.vout} missing both scriptPubKey and address`);
          }
          
          // Generate scriptPubKey for P2WPKH (Bech32) address
          try {
            // For P2WPKH addresses (starting with bc1), the scriptPubKey is OP_0 + 20-byte hash
            const address = bitcoin.address.fromBech32(utxo.address);
            if (address.version === 0 && address.data.length === 20) {
              // P2WPKH: OP_0 (0x00) + 20-byte hash
              // Convert the 20-byte hash to hex string
              const hashHex = Buffer.from(address.data).toString('hex');
              scriptPubKey = `0014${hashHex}`;
              console.log(`✅ Generated P2WPKH scriptPubKey: ${scriptPubKey}`);
              console.log(`🔧 Address data length: ${address.data.length}, hash: ${hashHex}`);
            } else {
              throw new Error(`Unsupported address type for ${utxo.address} - version: ${address.version}, data length: ${address.data.length}`);
            }
          } catch (addressError) {
            console.error('❌ Failed to generate scriptPubKey from address:', addressError);
            throw new Error(`Failed to generate scriptPubKey for address ${utxo.address}: ${addressError instanceof Error ? addressError.message : 'Unknown error'}`);
          }
        }
        
        const inputData = {
          hash: utxo.txid,
          index: utxo.vout,
          sequence: enableRBF ? 0xFFFFFFFD : undefined,
          witnessUtxo: {
            script: new Uint8Array(Buffer.from(scriptPubKey, 'hex')),
            value: BigInt(utxo.value),
          },
        };
        
        txb.addInput(inputData);
        console.log(`✅ Added PSBT input: ${utxo.txid.substring(0, 8)}...:${utxo.vout}`);
      }
      
      // Add outputs to PSBT
      console.log('🔧 Adding outputs to PSBT...');
      txb.addOutput({
        address: toAddress,
        value: BigInt(amountSatoshis),
      });
      console.log(`✅ Added PSBT output: ${toAddress.substring(0, 8)}... (${amountSatoshis} sats)`);
      
      // Add change output if needed
      if (changeAmount > 546) {
        console.log('🔧 Generating change address for amount:', changeAmount, 'satoshis');
        const changeAddress = await generateChangeAddress(mnemonic, 0);
        txb.addOutput({
          address: changeAddress,
          value: BigInt(changeAmount),
        });
        console.log('✅ Added PSBT change output:', changeAddress.substring(0, 8), '...', changeAmount, 'satoshis');
      } else if (changeAmount > 0) {
        console.log('⚠️ Change amount below dust threshold, adding to fee:', changeAmount, 'satoshis');
      }
      
    } else {
      // TransactionBuilder approach (legacy)
      console.log('🔧 Adding inputs to TransactionBuilder...');
      
      // Add inputs with RBF support
      for (const utxo of utxos) {
        if (enableRBF) {
          // Enable RBF by setting sequence number to 0xFFFFFFFD (allows replacement)
          txb.addInput(utxo.txid, utxo.vout, 0xFFFFFFFD);
        } else {
          // Standard sequence number (no RBF)
          txb.addInput(utxo.txid, utxo.vout);
        }
      }
      
      // Add output to recipient
      txb.addOutput(toAddress, amountSatoshis);
      
      // Add change output if needed (dust threshold is 546 satoshis)
      if (changeAmount > 546) {
        console.log('🔧 Generating change address for amount:', changeAmount, 'satoshis');
        const changeAddress = await generateChangeAddress(mnemonic, 0); // Use first change address
        txb.addOutput(changeAddress, changeAmount);
        console.log('✅ Added change output:', changeAddress, changeAmount, 'satoshis');
      } else if (changeAmount > 0) {
        console.log('⚠️ Change amount below dust threshold, adding to fee:', changeAmount, 'satoshis');
      }
    }
    
    // Sign inputs
    console.log('🔐 Signing transaction with private keys...');
    
    // Ensure bip32 module is loaded
    if (!bip32) {
      bip32 = await loadBip32Module();
    }
    
    if (!bip32 || !bip32.BIP32Factory) {
      throw new Error('BIP32 module or BIP32Factory not available');
    }
    const bip39 = require('bip39');
    const bip32Instance = bip32.BIP32Factory(ecc);
    
    // Derive root key
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32Instance.fromSeed(seed);
    
    // Sign each input with its corresponding private key
    for (let i = 0; i < utxos.length; i++) {
      const utxo = utxos[i];
      
      // Determine the address index for this UTXO
      // Use the addressIndex from the UTXO if available, otherwise fall back to the provided addressIndex
      const utxoAddressIndex = utxo.addressIndex !== undefined ? utxo.addressIndex : addressIndex;
      
      console.log(`🔐 Signing input ${i} with address index ${utxoAddressIndex} (UTXO: ${utxo.txid.substring(0, 8)}...)`);
      
      // Validate address index is non-negative
      if (utxoAddressIndex < 0) {
        throw new Error(`Invalid address index ${utxoAddressIndex} for UTXO ${utxo.txid}:${utxo.vout}`);
      }
      
      // Derive private key for this specific address index
      const child = root.derive(`m/84'/0'/0'/0/${utxoAddressIndex}`);
      
      if (!child.privateKey) {
        throw new Error(`Failed to derive private key for address index ${utxoAddressIndex}`);
      }
      
      if (isPSBT) {
        // PSBT signing approach
        console.log(`🔐 Signing PSBT input ${i} with P2WPKH...`);
        txb.signInput(i, child);
      } else {
        // TransactionBuilder signing approach (legacy)
        console.log(`🔐 Signing TransactionBuilder input ${i} with P2WPKH...`);
        // Parameters: (inputIndex, keyPair, redeemScript, hashType, witnessValue)
        txb.sign(i, child, null, bitcoin.Transaction.SIGHASH_ALL, utxo.value);
      }
    }
    
    // Build transaction
    let txHex: string;
    if (isPSBT) {
      console.log('🔧 Finalizing PSBT...');
      txb.finalizeAllInputs();
      const tx = txb.extractTransaction();
      txHex = tx.toHex();
    } else {
      console.log('🔧 Building TransactionBuilder transaction...');
      const tx = txb.build();
      txHex = tx.toHex();
    }
    
    console.log('✅ Transaction created:', txHex.substring(0, 100) + '...');
    return txHex;
  } catch (error) {
    console.error('❌ Failed to create transaction:', error);
    throw error;
  }
}

/**
 * Broadcast transaction to the network using Blockstream API
 */
async function broadcastTransaction(txHex: string): Promise<string> {
  try {
    console.log('📡 Broadcasting transaction to Blockstream...');
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.timeout = 30000; // 30 second timeout
      
      // Try Blockstream first, then Mempool.space
      const urls = [
        'https://blockstream.info/api/tx',
        'https://mempool.space/api/tx'
      ];
      
      let urlIndex = 0;
      
      const tryNextUrl = () => {
        if (urlIndex >= urls.length) {
          reject(new Error('All broadcast endpoints failed'));
          return;
        }
        
        console.log('📡 Trying broadcast URL:', urls[urlIndex]);
        xhr.open('POST', urls[urlIndex], true);
        xhr.setRequestHeader('Content-Type', 'text/plain');
        xhr.setRequestHeader('Accept', 'text/plain');
        xhr.setRequestHeader('User-Agent', 'BitSleuthWallet/1.0');
        xhr.send(txHex);
      };
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const txid = xhr.responseText.trim();
              console.log('✅ Transaction broadcasted successfully:', txid);
              resolve(txid);
            } catch (parseError) {
              console.error('❌ Failed to parse broadcast response:', parseError);
              reject(new Error('Failed to parse broadcast response'));
            }
          } else if (xhr.status >= 500 || xhr.status === 0) {
            // Server error or network issue, try next URL
            console.warn('⚠️ Broadcast endpoint failed, trying next...');
            urlIndex++;
            setTimeout(tryNextUrl, 1000);
          } else {
            // Client error (4xx), don't retry
            console.error('❌ Broadcast failed with status:', xhr.status);
            const responseText = xhr.responseText || '';
            
            // Handle specific error messages
            if (responseText.includes('insufficient priority')) {
              reject(new Error('Transaction fee too low. Please increase the fee rate.'));
            } else if (responseText.includes('already in block chain')) {
              reject(new Error('Transaction already exists in blockchain'));
            } else if (responseText.includes('bad-txns-inputs-missingorspent')) {
              reject(new Error('Transaction inputs are missing or already spent'));
            } else if (responseText.includes('bad-txns-in-belowout')) {
              reject(new Error('Transaction inputs are less than outputs'));
            } else {
              reject(new Error(`Broadcast failed: ${xhr.status} - ${responseText.substring(0, 200)}`));
            }
          }
        }
      };
      
      xhr.onerror = () => {
        console.error('❌ Broadcast network error');
        reject(new Error('Network error during broadcast'));
      };
      
      xhr.ontimeout = () => {
        console.error('❌ Broadcast timeout');
        reject(new Error('Broadcast request timeout'));
      };
      
      tryNextUrl();
    });
  } catch (error) {
    console.error('❌ Failed to broadcast transaction:', error);
    throw error;
  }
}
