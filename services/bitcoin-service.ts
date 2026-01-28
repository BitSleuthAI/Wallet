/**
 * Simplified Bitcoin Service - Only Essential Functions
 * Most functionality moved to esplora-service.ts and wallet-service.ts
 */

import { BitcoinPrice, UTXO } from '@/types/wallet';
import { loadBip32Module } from './bip32-loader';
import {
  validateECCLibraryFull,
  estimateTransactionSize,
  generateChangeAddress,
} from './ecc-utils';

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
 * Validate Bitcoin address format with proper checksum verification
 * Supports: P2WPKH (bc1q), P2WSH (bc1q 62 chars), P2TR (bc1p), P2PKH (1...), P2SH (3...)
 */
export const isValidBitcoinAddress = (address: string): boolean => {
  try {
    if (!address || typeof address !== 'string') {
      return false;
    }

    const trimmed = address.trim();

    // Bech32/Bech32m addresses (SegWit v0 and v1/Taproot)
    if (trimmed.toLowerCase().startsWith('bc1')) {
      try {
        const bitcoin = require('bitcoinjs-lib');
        // Use bitcoinjs-lib's address validation which handles both bech32 and bech32m
        bitcoin.address.fromBech32(trimmed);
        return true;
      } catch {
        // Bech32 decoding failed - invalid checksum or format
        return false;
      }
    }

    // Legacy P2PKH addresses (start with '1')
    if (trimmed.startsWith('1')) {
      try {
        const bitcoin = require('bitcoinjs-lib');
        // Validate Base58Check encoding
        const decoded = bitcoin.address.fromBase58Check(trimmed);
        // P2PKH version byte is 0x00 for mainnet
        return decoded.version === 0x00;
      } catch {
        return false;
      }
    }

    // P2SH addresses (start with '3')
    if (trimmed.startsWith('3')) {
      try {
        const bitcoin = require('bitcoinjs-lib');
        // Validate Base58Check encoding
        const decoded = bitcoin.address.fromBase58Check(trimmed);
        // P2SH version byte is 0x05 for mainnet
        return decoded.version === 0x05;
      } catch {
        return false;
      }
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

// Direct API call bypassing caching but respecting rate limits
async function fetchDirectUTXOs(address: string): Promise<any[]> {
  try {
    console.log('🌐 Direct API call for UTXOs (bypassing cache):', address.substring(0, 10) + '...');
    
    // Use esplora service to respect rate limiting, but with minimal cache TTL
    const { esploraGet } = await import('./esplora-service');
    const data = await esploraGet(`/address/${address}/utxo`, 1000); // 1 second TTL for "direct" calls
    
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

// estimateTransactionSize is imported from ecc-utils.ts

// generateChangeAddress is imported from ecc-utils.ts

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

    // Validate ECC library and initialize bitcoinjs-lib using shared utility
    console.log('🔧 Validating ECC library before bitcoinjs-lib initialization...');

    try {
      validateECCLibraryFull(ecc);
      console.log('✅ ECC library validation passed');
    } catch (eccError) {
      console.error('❌ ECC library validation failed:', eccError);
      throw new Error(`ECC library invalid: ${eccError instanceof Error ? eccError.message : 'Unknown error'}`);
    }

    // Initialize bitcoinjs-lib with ECC
    try {
      console.log('🔧 Initializing bitcoinjs-lib with ECC...');

      if (typeof bitcoin.initEccLib !== 'function') {
        throw new Error('bitcoinjs-lib.initEccLib is not a function');
      }

      const initResult = bitcoin.initEccLib(ecc);
      if (initResult instanceof Promise) {
        await initResult;
      }

      console.log('✅ bitcoinjs-lib initialized with ECC successfully');
    } catch (initError) {
      console.error('❌ Failed to initialize bitcoinjs-lib with ECC:', initError);
      throw new Error(`Failed to initialize bitcoinjs-lib: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
    }
    
    // Create PSBT (bitcoinjs-lib 7.0.0+ approach)
    console.log('🔧 Creating PSBT...');
    
    // Validate bitcoin.networks is available
    if (!bitcoin.networks || !bitcoin.networks.bitcoin) {
      throw new Error('bitcoin.networks not available');
    }
    
    // Create PSBT instance (bitcoinjs-lib 7.0.0+ only supports PSBT)
    const txb = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
    console.log('✅ PSBT created successfully');
    
    // Calculate total input value and change
    const totalInputValue = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    const changeAmount = totalInputValue - amountSatoshis - feeAmount;
    
    // Add inputs to PSBT
    console.log('🔧 Adding inputs to PSBT...');
    
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
      
      // Determine the address index and chain for this UTXO
      // Use the addressIndex and chain from the UTXO if available, otherwise fall back to defaults
      const utxoAddressIndex = utxo.addressIndex !== undefined ? utxo.addressIndex : addressIndex;
      const utxoChain = utxo.chain !== undefined ? utxo.chain : 0; // Default to external chain (0)
      
      console.log(`🔐 Signing input ${i} with chain ${utxoChain}, address index ${utxoAddressIndex} (UTXO: ${utxo.txid.substring(0, 8)}...)`);
      
      // Validate address index is non-negative
      if (utxoAddressIndex < 0) {
        throw new Error(`Invalid address index ${utxoAddressIndex} for UTXO ${utxo.txid}:${utxo.vout}`);
      }
      
      // Derive private key for this specific address index and chain
      // Chain 0 = external/receiving addresses, Chain 1 = internal/change addresses
      // Use derivePath for path strings, not derive (which takes a single index number)
      const child = root.derivePath(`m/84'/0'/0'/${utxoChain}/${utxoAddressIndex}`);
      
      if (!child.privateKey) {
        throw new Error(`Failed to derive private key for address index ${utxoAddressIndex}`);
      }
      
      // PSBT signing approach
      console.log(`🔐 Signing PSBT input ${i} with P2WPKH...`);
      txb.signInput(i, child);
    }
    
    // Finalize and extract transaction
    console.log('🔧 Finalizing PSBT...');
    txb.finalizeAllInputs();
    const tx = txb.extractTransaction();
    const txHex = tx.toHex();
    
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
          } else if (xhr.status === 429) {
            // Rate limited - wait and try next provider
            console.warn('⚠️ Broadcast rate limited, switching to next provider...');
            urlIndex++;
            setTimeout(tryNextUrl, 2000); // 2 second delay before trying next provider
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
