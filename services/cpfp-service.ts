/**
 * Child-Pays-for-Parent (CPFP) Service
 * Implements CPFP functionality for fee bumping received transactions
 */

import { CPFPOptions, CPFPTransaction, CPFPValidationResult, UTXO } from '@/types/wallet';
import { loadBip32Module } from './bip32-loader';
import { ensureECC } from './bitcoin-service';
import { esploraGet } from './esplora-service';

// Use centralized bip32 loader
let bip32: any = null;

// Types are imported from '@/types/wallet'

/**
 * Fetch transaction details from Blockstream API
 */
export async function fetchTransactionDetails(txid: string): Promise<any> {
  try {
    console.log(`🔍 Fetching transaction details for CPFP: ${txid}`);
    const txData = await esploraGet(`/tx/${txid}`, 300000); // Cache for 5 minutes
    return txData;
  } catch (error) {
    console.error(`❌ Failed to fetch transaction details:`, error);
    throw new Error(`Failed to fetch transaction details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate if a transaction can be bumped using CPFP
 * CPFP works by creating a child transaction that spends outputs from the parent transaction
 */
export async function validateCPFPTransaction(
  parentTxid: string, 
  walletAddresses: string[],
  options: CPFPOptions
): Promise<CPFPValidationResult> {
  try {
    console.log(`🔍 Validating CPFP for transaction: ${parentTxid}`);
    
    // Fetch parent transaction details
    const parentTxData = await fetchTransactionDetails(parentTxid);
    
    if (!parentTxData) {
      return {
        isValid: false,
        canCPFP: false,
        reason: 'Parent transaction not found'
      };
    }
    
    // Check if parent transaction is confirmed
    if (parentTxData.status?.confirmed) {
      return {
        isValid: false,
        canCPFP: false,
        reason: 'Parent transaction is already confirmed and cannot be bumped'
      };
    }
    
    // Check if we own any outputs from the parent transaction
    const walletAddressesSet = new Set(walletAddresses);
    const ourOutputs = parentTxData.vout?.filter((output: any) => {
      return output.scriptpubkey_address && 
             walletAddressesSet.has(output.scriptpubkey_address);
    });
    
    if (!ourOutputs || ourOutputs.length === 0) {
      return {
        isValid: false,
        canCPFP: false,
        reason: 'You do not own any outputs from this transaction'
      };
    }
    
    // Calculate total value we can spend from parent transaction
    const totalSpendableValue = ourOutputs.reduce((sum: number, output: any) => sum + output.value, 0);
    
    // Estimate child transaction size
    const childInputCount = ourOutputs.length;
    const childOutputCount = options.customOutputs ? options.customOutputs.length : 1; // Default: single output
    const childTxSize = estimateTransactionSize(childInputCount, childOutputCount);
    
    // Calculate required child fee to achieve target fee rate
    const parentTxSize = estimateTransactionSize(parentTxData.vin?.length || 0, parentTxData.vout?.length || 0);
    const parentFee = calculateParentFee(parentTxData);
    const parentFeeRate = parentFee / parentTxSize;
    
    // Calculate effective fee rate when combined with child transaction
    const totalSize = parentTxSize + childTxSize;
    const targetTotalFee = totalSize * options.targetFeeRate;
    const requiredChildFee = Math.max(targetTotalFee - parentFee, childTxSize); // At least 1 sat/vB for child
    
    // Check if we have enough value to pay the child fee
    const minChildFee = childTxSize; // Minimum 1 sat/vB
    const maxChildFee = options.maxChildFee || totalSpendableValue * 0.5; // Max 50% of spendable value
    
    if (requiredChildFee > maxChildFee) {
      return {
        isValid: false,
        canCPFP: false,
        reason: `Required child fee (${requiredChildFee} sats) exceeds maximum allowed (${maxChildFee} sats)`
      };
    }
    
    if (requiredChildFee < minChildFee) {
      return {
        isValid: false,
        canCPFP: false,
        reason: `Required child fee (${requiredChildFee} sats) is below minimum (${minChildFee} sats)`
      };
    }
    
    // Get UTXOs for our outputs
    const utxos: UTXO[] = [];
    for (const output of ourOutputs) {
      const address = output.scriptpubkey_address;
      try {
        const addressUtxos = await esploraGet(`/address/${address}/utxo`, 300000);
        if (Array.isArray(addressUtxos)) {
          const matchingUtxo = addressUtxos.find((utxo: any) => 
            utxo.txid === parentTxid && utxo.vout === output.n
          );
          if (matchingUtxo) {
            utxos.push({
              txid: matchingUtxo.txid,
              vout: matchingUtxo.vout,
              value: matchingUtxo.value,
              scriptPubKey: matchingUtxo.scriptpubkey,
              address: address,
              status: {
                confirmed: matchingUtxo.status?.confirmed || false,
                block_height: matchingUtxo.status?.block_height,
                block_hash: matchingUtxo.status?.block_hash,
                block_time: matchingUtxo.status?.block_time,
              },
            });
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch UTXO for output ${parentTxid}:${output.n}:`, error);
      }
    }
    
    if (utxos.length === 0) {
      return {
        isValid: false,
        canCPFP: false,
        reason: 'Could not find UTXOs for transaction outputs'
      };
    }
    
    const effectiveFeeRate = (parentFee + requiredChildFee) / totalSize;
    
    return {
      isValid: true,
      canCPFP: true,
      parentTx: parentTxData,
      utxos,
      estimatedChildFee: requiredChildFee,
      effectiveFeeRate
    };
  } catch (error) {
    console.error(`❌ CPFP validation failed:`, error);
    return {
      isValid: false,
      canCPFP: false,
      reason: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Create a CPFP child transaction
 */
export async function createCPFPTransaction(
  parentTxid: string,
  mnemonic: string,
  walletAddresses: string[],
  options: CPFPOptions
): Promise<CPFPTransaction> {
  try {
    console.log(`🔧 Creating CPFP transaction for parent: ${parentTxid}`);
    console.log(`💰 Target fee rate: ${options.targetFeeRate} sat/vB`);
    
    // Validate the transaction can be bumped
    const validation = await validateCPFPTransaction(parentTxid, walletAddresses, options);
    if (!validation.isValid || !validation.canCPFP) {
      throw new Error(validation.reason || 'Transaction cannot be bumped with CPFP');
    }
    
    const parentTx = validation.parentTx!;
    const utxos = validation.utxos!;
    const childFee = validation.estimatedChildFee!;
    
    // Ensure ECC is initialized
    await ensureECC();
    
    // Import required libraries
    const bitcoin = require('bitcoinjs-lib');
    const ecc = (global as any).ecc;
    
    // Ensure bip32 module is loaded
    if (!bip32) {
      bip32 = await loadBip32Module();
    }
    
    if (!bip32 || !bip32.BIP32Factory) {
      throw new Error('BIP32 module or BIP32Factory not available');
    }
    const bip39 = require('bip39');
    
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
      
      console.log('✅ ECC library validation passed');
    } catch (eccError) {
      console.error('❌ ECC library validation failed:', eccError);
      throw new Error(`ECC library invalid: ${eccError instanceof Error ? eccError.message : 'Unknown error'}`);
    }
    
    // Initialize bitcoinjs-lib with ECC
    try {
      console.log('🔧 Initializing bitcoinjs-lib with ECC...');
      bitcoin.initEccLib(ecc);
      
      // Verify the initialization worked by checking if ECC is properly set
      console.log('🔧 Verifying ECC initialization...');
      
      // Add a small delay to ensure ECC is fully initialized
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check if ECPair exists and has the required methods
      if (!bitcoin.ECPair) {
        console.error('❌ bitcoin.ECPair is undefined after initEccLib');
        throw new Error('bitcoin.ECPair not available after ECC initialization');
      }
      
      if (typeof bitcoin.ECPair.fromPrivateKey !== 'function') {
        console.error('❌ bitcoin.ECPair.fromPrivateKey is not a function');
        console.error('❌ Available ECPair methods:', Object.keys(bitcoin.ECPair));
        throw new Error('bitcoin.ECPair.fromPrivateKey method not available');
      }
      
      // Try to create a simple ECPair to verify ECC is working
      try {
        const testPrivateKey = new Uint8Array(32);
        testPrivateKey[31] = 1; // Set to 1 to ensure it's a valid private key
        
        // Test if we can create an ECPair (this is the real test)
        const testECPair = bitcoin.ECPair.fromPrivateKey(testPrivateKey);
        if (!testECPair || !testECPair.publicKey) {
          throw new Error('ECPair creation failed');
        }
        
        console.log('✅ ECC initialization verified - ECPair creation successful');
      } catch (verifyError) {
        console.error('❌ ECC verification failed:', verifyError);
        throw new Error('bitcoinjs-lib ECC initialization verification failed');
      }
      
      console.log('✅ bitcoinjs-lib initialized with ECC successfully');
    } catch (initError) {
      console.error('❌ Failed to initialize bitcoinjs-lib with ECC:', initError);
      throw new Error(`Failed to initialize bitcoinjs-lib: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
    }
    const bip32Instance = bip32.BIP32Factory(ecc);
    
    // Create PSBT (Partially Signed Bitcoin Transaction) for proper SegWit support
    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
    
    // Calculate total input value from parent transaction outputs
    let totalInputValue = 0;
    const inputMap = new Map<string, { utxo: UTXO; addressIndex: number }>();
    
    for (const utxo of utxos) {
      // Derive the actual BIP32 address index
      const addressIndex = await deriveAddressIndexFromAddress(mnemonic, utxo.address!);
      
      totalInputValue += utxo.value;
      inputMap.set(`${utxo.txid}:${utxo.vout}`, {
        utxo,
        addressIndex
      });
    }
    
    // Add inputs (spending parent transaction outputs) with proper SegWit support
    for (const [key, { utxo }] of inputMap) {
      // For P2WPKH inputs, we need to provide the witnessUtxo
      if (!utxo.scriptPubKey) {
        throw new Error(`Missing scriptPubKey for UTXO ${utxo.txid}:${utxo.vout}`);
      }
      
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: utxo.value
        }
      });
    }
    
    // Calculate outputs
    let totalOutputValue = 0;
    
    if (options.customOutputs && options.customOutputs.length > 0) {
      // Use custom outputs
      for (const output of options.customOutputs) {
        psbt.addOutput({
          address: output.address,
          value: Math.floor(output.amount * 1e8) // Convert BTC to satoshis
        });
        totalOutputValue += Math.floor(output.amount * 1e8);
      }
    } else {
      // Default: send to a new address in the wallet
      const changeAddress = await generateChangeAddress(mnemonic);
      const changeAmount = totalInputValue - childFee;
      
      if (changeAmount > 546) { // Dust threshold
        psbt.addOutput({
          address: changeAddress,
          value: changeAmount
        });
        totalOutputValue = changeAmount;
      } else {
        // If change would be dust, send everything as fee
        totalOutputValue = 0;
      }
    }
    
    // Verify we have enough inputs to cover outputs + fee
    const requiredTotal = totalOutputValue + childFee;
    if (totalInputValue < requiredTotal) {
      throw new Error(`Insufficient funds: need ${requiredTotal} sats, have ${totalInputValue} sats`);
    }
    
    // Sign the transaction
    console.log(`🔐 Signing CPFP transaction...`);
    
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32Instance.fromSeed(seed);
    
    // Sign each input using PSBT
    let inputIndex = 0;
    for (const [key, { utxo, addressIndex }] of inputMap) {
      // Derive private key for this address
      const child = root.derivePath(`m/84'/0'/0'/0/${addressIndex}`);
      
      if (!child.privateKey) {
        throw new Error(`Failed to derive private key for address index ${addressIndex}`);
      }
      
      // Sign the input using PSBT
      psbt.signInput(inputIndex, child);
      inputIndex++;
    }
    
    // Finalize all inputs
    for (let i = 0; i < inputMap.size; i++) {
      psbt.finalizeInput(i);
    }
    
    // Extract the final transaction
    const childTx = psbt.extractTransaction();
    const txHex = childTx.toHex();
    
    // Calculate effective fee rate
    const parentTxSize = estimateTransactionSize(parentTx.vin?.length || 0, parentTx.vout?.length || 0);
    const childTxSize = estimateTransactionSize(utxos.length, options.customOutputs ? options.customOutputs.length : 1);
    const parentFee = calculateParentFee(parentTx);
    const effectiveFeeRate = (parentFee + childFee) / (parentTxSize + childTxSize);
    
    console.log(`✅ CPFP transaction created: ${txHex.substring(0, 100)}...`);
    console.log(`✅ Child fee: ${childFee} sats, Effective fee rate: ${effectiveFeeRate.toFixed(2)} sat/vB`);
    
    return {
      parentTxid,
      parentTx: parentTx as any,
      targetFeeRate: options.targetFeeRate,
      childFee,
      effectiveFeeRate,
      childTx: txHex,
      status: 'pending'
    };
  } catch (error) {
    console.error(`❌ Failed to create CPFP transaction:`, error);
    throw error;
  }
}

/**
 * Broadcast the CPFP child transaction
 */
export async function broadcastCPFPTransaction(cpfpTx: CPFPTransaction): Promise<string> {
  try {
    if (!cpfpTx.childTx) {
      throw new Error('No child transaction to broadcast');
    }
    
    console.log(`📡 Broadcasting CPFP transaction...`);
    
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
        
        console.log(`📡 Trying broadcast URL: ${urls[urlIndex]}`);
        xhr.open('POST', urls[urlIndex], true);
        xhr.setRequestHeader('Content-Type', 'text/plain');
        xhr.setRequestHeader('Accept', 'text/plain');
        xhr.setRequestHeader('User-Agent', 'BitSleuthWallet/1.0');
        xhr.send(cpfpTx.childTx);
      };
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const txid = xhr.responseText.trim();
              console.log(`✅ CPFP transaction broadcasted successfully: ${txid}`);
              resolve(txid);
            } catch (parseError) {
              console.error(`❌ Failed to parse broadcast response:`, parseError);
              reject(new Error('Failed to parse broadcast response'));
            }
          } else if (xhr.status >= 500 || xhr.status === 0) {
            // Server error or network issue, try next URL
            console.warn(`⚠️ Broadcast endpoint failed, trying next...`);
            urlIndex++;
            setTimeout(tryNextUrl, 1000);
          } else {
            // Client error (4xx), don't retry
            console.error(`❌ Broadcast failed with status: ${xhr.status}`);
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
        console.error(`❌ Broadcast network error`);
        reject(new Error('Network error during broadcast'));
      };
      
      xhr.ontimeout = () => {
        console.error(`❌ Broadcast timeout`);
        reject(new Error('Broadcast request timeout'));
      };
      
      tryNextUrl();
    });
  } catch (error) {
    console.error(`❌ Failed to broadcast CPFP transaction:`, error);
    throw error;
  }
}

/**
 * Complete CPFP process: validate, create, and broadcast
 */
export async function performCPFP(
  parentTxid: string,
  mnemonic: string,
  walletAddresses: string[],
  options: CPFPOptions
): Promise<{ success: boolean; childTxid?: string; error?: string }> {
  try {
    console.log(`🔄 Starting CPFP process for transaction: ${parentTxid}`);
    
    // Step 1: Create CPFP transaction
    const cpfpTx = await createCPFPTransaction(
      parentTxid,
      mnemonic,
      walletAddresses,
      options
    );
    
    // Step 2: Broadcast CPFP transaction
    const childTxid = await broadcastCPFPTransaction(cpfpTx);
    
    console.log(`✅ CPFP completed successfully. Child TXID: ${childTxid}`);
    
    return {
      success: true,
      childTxid
    };
  } catch (error) {
    console.error(`❌ CPFP failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Calculate the fee paid by the parent transaction
 */
function calculateParentFee(parentTx: any): number {
  // Calculate total input value
  let totalInputValue = 0;
  for (const input of parentTx.vin || []) {
    totalInputValue += input.prevout?.value || 0;
  }
  
  // Calculate total output value
  let totalOutputValue = 0;
  for (const output of parentTx.vout || []) {
    totalOutputValue += output.value || 0;
  }
  
  return totalInputValue - totalOutputValue;
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

// Cache for address-to-index mappings to avoid redundant derivations
const addressIndexCache = new Map<string, number>();

/**
 * Clear the address index cache
 */
export function clearCPFPAddressIndexCache(): void {
  addressIndexCache.clear();
  console.log(`🧹 Cleared CPFP address index cache`);
}

/**
 * Derive the BIP32 address index from an address by testing derivation paths
 */
export async function deriveAddressIndexFromAddress(mnemonic: string, targetAddress: string): Promise<number> {
  try {
    // Check cache first
    if (addressIndexCache.has(targetAddress)) {
      const cachedIndex = addressIndexCache.get(targetAddress)!;
      console.log(`✅ Found cached BIP32 index ${cachedIndex} for address: ${targetAddress}`);
      return cachedIndex;
    }
    
    console.log(`🔍 Deriving BIP32 index for address: ${targetAddress}`);
    
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
    const bech32 = await import('bech32');
    const { sha256 } = await import('@noble/hashes/sha256');
    const { ripemd160 } = await import('@noble/hashes/ripemd160');
    
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32Instance.fromSeed(seed);
    const externalChain = root.derivePath(`m/84'/0'/0'/0`);
    
    // Use optimized linear search with batching to prevent UI blocking
    let foundIndex = -1;
    const batchSize = 50;
    const batchDelay = 5;
    let currentIndex = 0;
    const maxSearchRange = 10000;
    
    while (foundIndex === -1 && currentIndex < maxSearchRange) {
      const endIndex = Math.min(currentIndex + batchSize, maxSearchRange);
      
      for (let i = currentIndex; i < endIndex; i++) {
        try {
          const child = externalChain.derive(i);
          if (!child.publicKey) continue;
          
          // Generate P2WPKH address
          const sha256Hash = sha256(child.publicKey);
          const hash160 = ripemd160(sha256Hash);
          const words = bech32.bech32.toWords(hash160);
          const address = bech32.bech32.encode('bc', [0, ...words]);
          
          if (address === targetAddress) {
            foundIndex = i;
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to derive address at index ${i}:`, error);
          continue;
        }
      }
      
      currentIndex = endIndex;
      
      // Small delay between batches to prevent UI blocking
      if (foundIndex === -1 && currentIndex < maxSearchRange) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }
    
    if (foundIndex === -1) {
      throw new Error(`Could not find BIP32 index for address: ${targetAddress} (searched up to index ${currentIndex})`);
    }
    
    // Cache the result
    addressIndexCache.set(targetAddress, foundIndex);
    console.log(`✅ Found BIP32 index ${foundIndex} for address: ${targetAddress}`);
    return foundIndex;
  } catch (error) {
    console.error(`❌ Failed to derive address index:`, error);
    throw error;
  }
}

/**
 * Generate a change address using the wallet's derivation path
 */
async function generateChangeAddress(mnemonic: string, changeIndex: number = 0): Promise<string> {
  try {
    console.log(`🔧 Generating change address for index: ${changeIndex}`);
    
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
    const child = root.derivePath(`m/84'/0'/0'/1/${changeIndex}`);
    
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
    
    console.log(`✅ Generated change address: ${address}`);
    return address;
  } catch (error) {
    console.error(`❌ Failed to generate change address:`, error);
    throw error;
  }
}

/**
 * Get CPFP recommendations based on current network conditions
 */
export async function getCPFPRecommendations(
  parentTxid: string,
  walletAddresses: string[]
): Promise<{
  recommendedFeeRate: number;
  estimatedChildFee: number;
  effectiveFeeRate: number;
  timeEstimate: string;
} | null> {
  try {
    // Get current fee estimates
    const { feeEstimationService } = await import('./fee-service');
    const feeEstimates = await feeEstimationService.getFeeEstimates();
    
    // Validate the transaction
    const validation = await validateCPFPTransaction(parentTxid, walletAddresses, {
      targetFeeRate: feeEstimates.halfHourFee
    });
    
    if (!validation.isValid || !validation.canCPFP) {
      return null;
    }
    
    // Calculate recommendations
    const recommendedFeeRate = feeEstimates.halfHourFee;
    const estimatedChildFee = validation.estimatedChildFee || 0;
    const effectiveFeeRate = validation.effectiveFeeRate || 0;
    
    // Estimate confirmation time based on effective fee rate
    let timeEstimate = 'Unknown';
    if (effectiveFeeRate >= feeEstimates.fastestFee) {
      timeEstimate = '5-15 minutes';
    } else if (effectiveFeeRate >= feeEstimates.halfHourFee) {
      timeEstimate = '15-30 minutes';
    } else if (effectiveFeeRate >= feeEstimates.hourFee) {
      timeEstimate = '30-60 minutes';
    } else {
      timeEstimate = '1-3 hours';
    }
    
    return {
      recommendedFeeRate,
      estimatedChildFee,
      effectiveFeeRate,
      timeEstimate
    };
  } catch (error) {
    console.error(`❌ Failed to get CPFP recommendations:`, error);
    return null;
  }
}
