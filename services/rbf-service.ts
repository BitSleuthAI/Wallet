/**
 * Replace-by-Fee (RBF) Service
 * Implements RBF functionality using Blockstream API
 */

import { UTXO } from '@/types/wallet';
import { loadBip32Module } from './bip32-loader';
import { ensureECC } from './bitcoin-service';
import { esploraGet } from './esplora-service';
import {
  validateECCLibrary,
  validateECCLibraryFull,
  estimateTransactionSize,
  deriveAddressIndexAndChainFromAddress,
  deriveAddressIndexFromAddress,
  findNextUnusedAddressIndex,
  generateCancellationAddress,
  clearAddressIndexCache,
} from './ecc-utils';

// Use centralized bip32 loader
let bip32Module: unknown = null;

/**
 * Sequence number that disables RBF (Replace-by-Fee) by default.
 * Bitcoin interprets 0xFFFFFFFF as the maximum sequence number, meaning
 * the transaction cannot be replaced. Used as fallback for failed parsing.
 */
const NON_RBF_SEQUENCE = 0xFFFFFFFF;

/**
 * Minimum required fee increase (as a fraction of the original fee)
 * to consider a replacement transaction for RBF.
 * For example, 0.1 means a 10% minimum fee increase.
 */
const MIN_RBF_FEE_INCREASE_RATE = 0.1;

// validateECCLibrary is imported from ecc-utils.ts

export interface EsploraTransactionVin {
  txid?: string;
  vout?: number;
  sequence?: number;
  prevout?: {
    value?: number;
    scriptpubkey?: string;
    scriptpubkey_address?: string;
  } | null;
  [key: string]: unknown;
}

export interface EsploraTransactionVout {
  value?: number;
  scriptpubkey?: string;
  scriptpubkey_address?: string;
  [key: string]: unknown;
}

/**
 * Minimal representation of an Esplora transaction used by the RBF service.
 * Additional fields returned by Esplora are allowed via the index signature.
 */
export interface EsploraTransaction {
  txid: string;
  version?: number;
  locktime?: number;
  vin: EsploraTransactionVin[];
  vout: EsploraTransactionVout[];
  status?: {
    confirmed?: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  [key: string]: unknown;
}

export interface RBFTransaction {
  txid: string;
  originalTx: EsploraTransaction; // Raw Esplora transaction with vin/vout properties
  newFeeRate: number;
  newFee: number;
  replacementTx?: string; // hex transaction
  status: 'pending' | 'broadcasted' | 'confirmed' | 'failed';
  error?: string;
}

export interface RBFValidationResult {
  isValid: boolean;
  canReplace: boolean;
  reason?: string;
  originalTx?: EsploraTransaction; // Raw Esplora transaction with vin/vout properties
  utxos?: UTXO[];
}

/**
 * Parse sequence number from API response
 * Handles both decimal and hexadecimal formats
 * 
 * Fix: Previously used parseInt(sequence, 16) which incorrectly assumed
 * all sequence numbers were hexadecimal. APIs often return decimal integers,
 * causing incorrect RBF validation. This function now detects the format
 * and parses accordingly.
 */
function parseSequenceNumber(sequence: unknown): number {
  if (typeof sequence === 'number') {
    return sequence;
  }
  
  if (typeof sequence === 'string') {
    // Check if it's a hexadecimal string (prefixed with '0x' or '0X')
    if (sequence.startsWith('0x') || sequence.startsWith('0X')) {
      const parsed = parseInt(sequence, 16);
      if (isNaN(parsed)) {
        console.warn(`⚠️ Failed to parse hexadecimal sequence: ${sequence}`);
        return NON_RBF_SEQUENCE; // Default to non-RBF sequence
      }
      return parsed;
    }
    // Otherwise parse as decimal
    const parsed = parseInt(sequence, 10);
    if (isNaN(parsed)) {
      console.warn(`⚠️ Failed to parse decimal sequence: ${sequence}`);
      return NON_RBF_SEQUENCE; // Default to non-RBF sequence
    }
    return parsed;
  }
  
  // If sequence is not a number or string, try to convert to string first
  const sequenceStr = String(sequence);
  if (sequenceStr.startsWith('0x') || sequenceStr.startsWith('0X')) {
    const parsed = parseInt(sequenceStr, 16);
    if (isNaN(parsed)) {
      console.warn(`⚠️ Failed to parse hexadecimal sequence: ${sequenceStr}`);
      return NON_RBF_SEQUENCE; // Default to non-RBF sequence
    }
    return parsed;
  }
  
  const parsed = parseInt(sequenceStr, 10);
  if (isNaN(parsed)) {
    console.warn(`⚠️ Failed to parse sequence: ${sequenceStr}`);
    return NON_RBF_SEQUENCE; // Default to non-RBF sequence
  }
  
  return parsed;
}

/**
 * Fetch UTXO data for a specific transaction input
 * Handles both confirmed and unconfirmed transactions
 */
async function fetchUTXOForInput(
  inputTxid: string, 
  inputVout: number, 
  address: string,
  addressUtxoMap: Map<string, any[]>
): Promise<any | null> {
  // First, try to find it in the cached UTXOs
  let utxo = addressUtxoMap.get(address)?.find((u: any) => 
    u.txid === inputTxid && u.vout === inputVout
  );
  
  // If not found in cached UTXOs, it might be spent in mempool
  // Try to fetch the specific transaction output directly
  if (!utxo) {
    try {
      console.log(`🔍 UTXO not found in address UTXOs, fetching transaction output directly: ${inputTxid}:${inputVout}`);
      const txData = await esploraGet(`/tx/${inputTxid}`, 300000);
      
      if (txData && txData.vout && txData.vout[inputVout]) {
        const output = txData.vout[inputVout];
        utxo = {
          txid: inputTxid,
          vout: inputVout,
          value: output.value,
          scriptpubkey: output.scriptpubkey,
          status: txData.status || { confirmed: false }
        };
        console.log(`✅ Found UTXO from transaction data: ${utxo.value} sats`);
      } else {
        console.error(`❌ Transaction ${inputTxid} does not have output ${inputVout}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch transaction output for ${inputTxid}:${inputVout}:`, error);
    }
  }
  
  return utxo;
}

/**
 * Fetch transaction details from Blockstream API
 */
export async function fetchTransactionDetails(txid: string): Promise<any> {
  try {
    console.log(`🔍 Fetching transaction details for: ${txid}`);
    const txData = await esploraGet(`/tx/${txid}`, 300000); // Cache for 5 minutes
    return txData;
  } catch (error) {
    console.error(`❌ Failed to fetch transaction details:`, error);
    throw new Error(`Failed to fetch transaction details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate if a transaction can be replaced using RBF
 */
export async function validateRBFTransaction(txid: string, walletAddresses: string[]): Promise<RBFValidationResult> {
  try {
    console.log(`🔍 Validating RBF for transaction: ${txid}`);
    
    // Fetch transaction details
    const txData = await fetchTransactionDetails(txid);
    
    if (!txData) {
      return {
        isValid: false,
        canReplace: false,
        reason: 'Transaction not found'
      };
    }
    
    // Check if transaction is confirmed
    if (txData.status?.confirmed) {
      return {
        isValid: false,
        canReplace: false,
        reason: 'Transaction is already confirmed and cannot be replaced'
      };
    }
    
    // Check if transaction has RBF enabled (sequence number < 0xFFFFFFFE)
    const hasRBF = txData.vin?.some((input: any) => {
      const sequence = parseSequenceNumber(input.sequence);
      console.log(`🔍 Input sequence: ${input.sequence} (parsed as: ${sequence})`);
      return sequence < 0xFFFFFFFE;
    });
    
    if (!hasRBF) {
      return {
        isValid: false,
        canReplace: false,
        reason: 'Transaction does not have RBF enabled'
      };
    }
    
    // Check if we own any of the inputs
    const walletAddressesSet = new Set(walletAddresses);
    const ourInputs = txData.vin?.filter((input: any) => {
      return input.prevout?.scriptpubkey_address && 
             walletAddressesSet.has(input.prevout.scriptpubkey_address);
    });
    
    if (!ourInputs || ourInputs.length === 0) {
      return {
        isValid: false,
        canReplace: false,
        reason: 'You do not own any inputs in this transaction'
      };
    }
    
    // Get UTXOs for our addresses to ensure we have the funds
    // For unconfirmed transactions, we need to fetch UTXOs differently since
    // the /address/{address}/utxo endpoint won't return inputs already spent in mempool
    const utxos: UTXO[] = [];
    
    // First, try to get UTXOs from the standard endpoint
    const addressUtxoMap = new Map<string, any[]>();
    for (const input of ourInputs) {
      const address = input.prevout.scriptpubkey_address;
      if (!addressUtxoMap.has(address)) {
        try {
          const addressUtxos = await esploraGet(`/address/${address}/utxo`, 300000);
          if (Array.isArray(addressUtxos)) {
            addressUtxoMap.set(address, addressUtxos);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch UTXOs for address ${address}:`, error);
          addressUtxoMap.set(address, []);
        }
      }
    }
    
    // Now, for each input, try to find the corresponding UTXO
    for (const input of ourInputs) {
      const address = input.prevout.scriptpubkey_address;
      const inputTxid = input.txid;
      const inputVout = input.vout;
      
      // Use the helper function to fetch UTXO data
      const utxo = await fetchUTXOForInput(inputTxid, inputVout, address, addressUtxoMap);
      
      // If we found a UTXO, add it to our list
      if (utxo) {
        utxos.push({
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          scriptPubKey: utxo.scriptpubkey,
          address: address, // Always include address for proper matching
          status: {
            confirmed: utxo.status?.confirmed || false,
            block_height: utxo.status?.block_height,
            block_hash: utxo.status?.block_hash,
            block_time: utxo.status?.block_time,
          },
        });
      } else {
        console.error(`❌ Could not find UTXO for input ${inputTxid}:${inputVout} at address ${address}`);
        throw new Error(`UTXO not found for input ${inputTxid}:${inputVout}. This input may have been spent or the transaction may be invalid.`);
      }
    }
    
    return {
      isValid: true,
      canReplace: true,
      originalTx: txData,
      utxos
    };
  } catch (error) {
    console.error(`❌ RBF validation failed:`, error);
    return {
      isValid: false,
      canReplace: false,
      reason: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Create a replacement transaction with higher fee
 * 
 * Key fixes implemented:
 * 1. Proper fee calculation by adjusting change output instead of adding fee on top
 * 2. Support for different output types (address-based and script-based)
 * 3. Correct UTXO lookup for unconfirmed transactions
 * 4. Proper handling of dust change outputs
 * 5. Uses the requested newFeeRate parameter instead of hardcoded 10% increase
 * 6. Validates that the new fee rate meets RBF requirements
 */
export async function createReplacementTransaction(
  originalTxid: string,
  newFeeRate: number,
  mnemonic: string,
  walletAddresses: string[]
): Promise<RBFTransaction> {
  try {
    console.log(`🔧 Creating replacement transaction for: ${originalTxid}`);
    console.log(`💰 New fee rate: ${newFeeRate} sat/vB`);
    
    // Validate the transaction can be replaced
    const validation = await validateRBFTransaction(originalTxid, walletAddresses);
    if (!validation.isValid || !validation.canReplace) {
      throw new Error(validation.reason || 'Transaction cannot be replaced');
    }
    
    const originalTx = validation.originalTx!;
    const utxos = validation.utxos!;
    
    // Ensure ECC is initialized
    await ensureECC();
    
    // Import required libraries
    const bitcoin = require('bitcoinjs-lib');
    const ecc = (global as any).ecc;
    
    // Ensure bip32 module is loaded
    if (!bip32Module) {
      bip32Module = await loadBip32Module();
    }
    
    if (!bip32Module || !(bip32Module as any).BIP32Factory) {
      throw new Error('BIP32 module or BIP32Factory not available');
    }
    const bip32 = bip32Module as any;
    const bip39 = require('bip39');
    
    if (!ecc) {
      throw new Error('ECC library not available');
    }

    // Validate ECC library and initialize bitcoinjs-lib using shared utilities
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
      bitcoin.initEccLib(ecc);
      console.log('✅ bitcoinjs-lib initialized with ECC successfully');
    } catch (initError) {
      console.error('❌ Failed to initialize bitcoinjs-lib with ECC:', initError);
      throw new Error(`Failed to initialize bitcoinjs-lib: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
    }
    const bip32Instance = bip32.BIP32Factory(ecc);
    
    // Create transaction builder (replace TransactionBuilder with PSBT for modern bitcoinjs-lib)
    // TransactionBuilder is deprecated in newer versions of bitcoinjs-lib. Consider migrating to PSBT (Partially Signed Bitcoin Transaction) for better compatibility and future-proofing.
    let txb = new bitcoin.TransactionBuilder(bitcoin.networks.bitcoin);
    
    // Get our inputs from the original transaction
    const walletAddressesSet = new Set(walletAddresses);
    const ourInputs = originalTx.vin?.filter((input: any) => {
      return input.prevout?.scriptpubkey_address && 
             walletAddressesSet.has(input.prevout.scriptpubkey_address);
    });
    
    if (!ourInputs || ourInputs.length === 0) {
      throw new Error('No inputs found for this wallet');
    }
    
    // Calculate total input value
    let totalInputValue = 0;
    const inputMap = new Map<string, { input: any; utxo: UTXO; addressIndex: number; chain: number }>();
    
    for (const input of ourInputs) {
      const address = input.prevout?.scriptpubkey_address;
      
      if (!address) {
        throw new Error(`Input missing address information: ${JSON.stringify(input)}`);
      }
      
      // Derive the actual BIP32 address index and chain instead of using array index
      const { index: addressIndex, chain } = await deriveAddressIndexAndChainFromAddress(mnemonic, address);
      
      // Find the corresponding UTXO - improved matching logic
      const utxo = utxos.find(u => {
        // Primary match: txid and vout must match exactly
        const txidMatch = u.txid === input.txid;
        const voutMatch = u.vout === input.vout;
        
        // Address match: either the UTXO has the address field set, or we know it from the input
        const addressMatch = u.address === address || !u.address;
        
        return txidMatch && voutMatch && addressMatch;
      });
      
      if (!utxo) {
        console.error(`❌ UTXO not found for input ${input.txid}:${input.vout}`);
        console.error(`Available UTXOs:`, utxos.map(u => ({ txid: u.txid, vout: u.vout, address: u.address })));
        throw new Error(`UTXO not found for input ${input.txid}:${input.vout}`);
      }
      
      // Ensure the UTXO has the correct address for signing
      if (!utxo.address) {
        utxo.address = address;
      }
      
      totalInputValue += utxo.value;
      inputMap.set(`${input.txid}:${input.vout}`, {
        input,
        utxo,
        addressIndex,
        chain
      });
    }
    
    // Add inputs with RBF enabled (sequence number 0xFFFFFFFD)
    for (const [, { utxo }] of inputMap) {
      txb.addInput(utxo.txid, utxo.vout, 0xFFFFFFFD);
    }
    
    // Calculate outputs (same as original transaction)
    let totalOutputValue = 0;
    for (const output of originalTx.vout) {
      // Handle different output types
      if (output.scriptpubkey_address) {
        // P2PKH, P2WPKH, P2SH outputs
        txb.addOutput(output.scriptpubkey_address, output.value);
        console.log(`📤 Output: ${output.scriptpubkey_address} - ${output.value} sats`);
      } else if (output.scriptpubkey) {
        // Raw script outputs (OP_RETURN, etc.)
        txb.addOutput(Buffer.from(output.scriptpubkey, 'hex'), output.value);
        console.log(`📤 Script output: ${output.scriptpubkey.substring(0, 20)}... - ${output.value} sats`);
      } else {
        throw new Error(`Unsupported output type: ${JSON.stringify(output)}`);
      }
      totalOutputValue += output.value ?? 0;
    }
    
    // Find the change output in the original transaction (if any)
    let changeOutputIndex = -1;
    let changeOutputValue = 0;
    
    // Look for a change output (typically the last output that goes to our wallet)
    for (let i = originalTx.vout.length - 1; i >= 0; i--) {
      const output = originalTx.vout[i];
      if (output.scriptpubkey_address && walletAddressesSet.has(output.scriptpubkey_address)) {
        changeOutputIndex = i;
        changeOutputValue = output.value ?? 0;
        break;
      }
    }
    
    // Calculate the original fee
    const originalFee = totalInputValue - totalOutputValue;
    
    // Calculate the original fee rate
    const originalSize = estimateTransactionSize(ourInputs.length, originalTx.vout.length);
    const originalFeeRate = originalFee / originalSize;
    
    // Calculate the target fee based on the desired fee rate
    const targetFee = Math.ceil(newFeeRate * originalSize);
    
    // Validate that the requested fee rate is reasonable
    if (newFeeRate < originalFeeRate) {
      throw new Error(`Requested fee rate (${newFeeRate} sat/vB) is lower than original fee rate (${originalFeeRate.toFixed(2)} sat/vB). RBF requires a higher fee rate.`);
    }
    
    // Ensure the new fee meets RBF requirements (must be higher than original)
    // Only apply minimum increase if user's requested fee is too low
    const minFeeIncrease = Math.ceil(originalFee * MIN_RBF_FEE_INCREASE_RATE); // minimum increase for RBF
    const actualTargetFee = Math.max(targetFee, originalFee + minFeeIncrease);
    
    const feeIncrease = actualTargetFee - originalFee;
    
    // Check if the fee increase is too small (less than 1 sat/vB improvement)
    const feeRateIncrease = (actualTargetFee / originalSize) - originalFeeRate;
    if (feeRateIncrease < 1) {
      console.warn(`⚠️ Fee rate increase is very small: ${feeRateIncrease.toFixed(2)} sat/vB. This may not be sufficient for RBF.`);
    }
    
    console.log(`💰 Fee calculation: Original fee: ${originalFee} sats (${originalFeeRate.toFixed(2)} sat/vB)`);
    console.log(`💰 Target fee: ${actualTargetFee} sats (${(actualTargetFee / originalSize).toFixed(2)} sat/vB)`);
    console.log(`💰 Requested fee rate: ${newFeeRate} sat/vB`);
    console.log(`💰 Fee increase: ${feeIncrease} sats`);
    console.log(`💰 Change output: ${changeOutputValue} sats at index ${changeOutputIndex}`);
    
    // Check if we have enough funds for the fee increase
    if (feeIncrease > changeOutputValue) {
      throw new Error(`Insufficient change to pay increased fee. Need ${feeIncrease} sats more, but only have ${changeOutputValue} sats in change output.`);
    }
    
    // Calculate actual output values and transaction size
    let actualOutputCount = originalTx.vout.length;
    let actualOutputValue: number;
    let newChangeValue = 0;
    
    // Adjust the change output value
    if (changeOutputIndex >= 0) {
      newChangeValue = changeOutputValue - feeIncrease;
      if (newChangeValue <= 546) { // Dust threshold
        // Change output would be dust, remove it entirely
        actualOutputCount = originalTx.vout.length - 1;
        actualOutputValue = totalOutputValue - changeOutputValue;
        console.log(`🗑️ Removing dust change output: ${changeOutputValue} sats`);
      } else {
        // Keep the change output with adjusted value
        actualOutputValue = totalOutputValue - feeIncrease;
        console.log(`💰 Adjusting change output: ${changeOutputValue} → ${newChangeValue} sats`);
      }
    } else {
      // No change output found, this is a rare case
      throw new Error('No change output found in original transaction. Cannot adjust fee without reducing recipient amounts.');
    }
    
    // Calculate the actual fee based on the real transaction
    const actualFee = totalInputValue - actualOutputValue;
    
    // Recalculate fee rate based on actual transaction size
    const actualSize = estimateTransactionSize(ourInputs.length, actualOutputCount);
    const actualFeeRate = actualFee / actualSize;
    
    console.log(`📊 Transaction stats: ${ourInputs.length} inputs, ${actualOutputCount} outputs, ${actualSize} vB`);
    console.log(`📊 Actual fee: ${actualFee} sats, Actual fee rate: ${actualFeeRate.toFixed(2)} sat/vB`);
    
    // Rebuild the transaction with correct outputs
    txb = new bitcoin.TransactionBuilder(bitcoin.networks.bitcoin);
    
    // Re-add inputs
    for (const [, { utxo }] of inputMap) {
      txb.addInput(utxo.txid, utxo.vout, 0xFFFFFFFD);
    }
    
    // Re-add outputs with correct values
    for (let i = 0; i < originalTx.vout.length; i++) {
      if (i === changeOutputIndex) {
        // This is the change output
        if (newChangeValue > 546) {
          // Keep the change output with adjusted value
          const output = originalTx.vout[i];
          if (output.scriptpubkey_address) {
            txb.addOutput(output.scriptpubkey_address, newChangeValue);
          } else if (output.scriptpubkey) {
            txb.addOutput(Buffer.from(output.scriptpubkey, 'hex'), newChangeValue);
          }
        }
        // If newChangeValue <= 546, skip this output (dust)
      } else {
        // Regular output, keep original value
        const output = originalTx.vout[i];
        if (output.scriptpubkey_address) {
          txb.addOutput(output.scriptpubkey_address, output.value);
        } else if (output.scriptpubkey) {
          txb.addOutput(Buffer.from(output.scriptpubkey, 'hex'), output.value);
        }
      }
    }
    
    // Sign the transaction
    console.log(`🔐 Signing replacement transaction...`);
    
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32Instance.fromSeed(seed);
    
    // Sign each input
    let inputIndex = 0;
    for (const [, { utxo, addressIndex, chain }] of inputMap) {
      // Derive private key for this address using the correct chain
      // Chain 0 = external/receiving addresses, Chain 1 = internal/change addresses
      const child = root.derivePath(`m/84'/0'/0'/${chain}/${addressIndex}`);
      
      if (!child.privateKey) {
        throw new Error(`Failed to derive private key for chain ${chain}, address index ${addressIndex}`);
      }
      
      // Sign the input
      txb.sign(inputIndex, child, null, bitcoin.Transaction.SIGHASH_ALL, utxo.value);
      inputIndex++;
    }
    
    // Build the transaction
    const replacementTx = txb.build();
    const txHex = replacementTx.toHex();
    
    console.log(`✅ Replacement transaction created: ${txHex.substring(0, 100)}...`);
    console.log(`✅ Actual fee: ${actualFee} sats, Target fee: ${actualTargetFee} sats`);
    console.log(`✅ Actual fee rate: ${actualFeeRate.toFixed(2)} sat/vB, Requested: ${newFeeRate} sat/vB`);
    
    // Log if the fee was adjusted due to RBF requirements
    if (actualTargetFee > targetFee) {
      console.log(`⚠️ Fee was increased from ${(targetFee / originalSize).toFixed(2)} to ${actualFeeRate.toFixed(2)} sat/vB to meet RBF minimum requirements`);
    }
    
    // Verify the transaction is valid
    if (actualFee < actualTargetFee * 0.9) { // Allow 10% tolerance
      throw new Error(`Replacement transaction fee too low. Expected: ${actualTargetFee} sats, Actual: ${actualFee} sats`);
    }
    
    return {
      txid: originalTxid,
      originalTx: originalTx as any,
      newFeeRate: actualFeeRate,
      newFee: actualFee,
      replacementTx: txHex,
      status: 'pending'
    };
  } catch (error) {
    console.error(`❌ Failed to create replacement transaction:`, error);
    throw error;
  }
}

/**
 * Broadcast the replacement transaction
 */
export async function broadcastReplacementTransaction(rbfTx: RBFTransaction): Promise<string> {
  try {
    if (!rbfTx.replacementTx) {
      throw new Error('No replacement transaction to broadcast');
    }
    
    console.log(`📡 Broadcasting replacement transaction...`);
    
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
        xhr.send(rbfTx.replacementTx);
      };
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const txid = xhr.responseText.trim();
              console.log(`✅ Replacement transaction broadcasted successfully: ${txid}`);
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
            } else if (responseText.includes('replacement transaction underpriced')) {
              reject(new Error('Replacement transaction fee is too low. Please increase the fee rate.'));
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
    console.error(`❌ Failed to broadcast replacement transaction:`, error);
    throw error;
  }
}

/**
 * Complete RBF process: validate, create, and broadcast
 */
export async function performRBF(
  originalTxid: string,
  newFeeRate: number,
  mnemonic: string,
  walletAddresses: string[]
): Promise<{ success: boolean; replacementTxid?: string; error?: string }> {
  try {
    console.log(`🔄 Starting RBF process for transaction: ${originalTxid}`);
    
    // Step 1: Create replacement transaction
    const rbfTx = await createReplacementTransaction(
      originalTxid,
      newFeeRate,
      mnemonic,
      walletAddresses
    );
    
    // Step 2: Broadcast replacement transaction
    const replacementTxid = await broadcastReplacementTransaction(rbfTx);
    
    console.log(`✅ RBF completed successfully. Replacement TXID: ${replacementTxid}`);
    
    return {
      success: true,
      replacementTxid
    };
  } catch (error) {
    console.error(`❌ RBF failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Cancel a transaction by creating a replacement that sends funds back to wallet
 * This effectively cancels the original transaction by spending its inputs
 */
export async function cancelTransaction(
  originalTxid: string,
  mnemonic: string,
  walletAddresses: string[]
): Promise<{ success: boolean; cancellationTxid?: string; error?: string }> {
  try {
    console.log(`🚫 Starting transaction cancellation for: ${originalTxid}`);
    
    // Step 1: Validate the transaction can be cancelled
    const validation = await validateRBFTransaction(originalTxid, walletAddresses);
    if (!validation.isValid || !validation.canReplace) {
      throw new Error(validation.reason || 'Transaction cannot be cancelled');
    }
    
    const originalTx = validation.originalTx!;
    const utxos = validation.utxos!;
    
    // Step 2: Create cancellation transaction
    const cancellationTx = await createCancellationTransaction(
      originalTx,
      utxos,
      mnemonic,
      walletAddresses
    );
    
    // Step 3: Broadcast cancellation transaction
    const cancellationTxid = await broadcastReplacementTransaction(cancellationTx);
    
    console.log(`✅ Transaction cancelled successfully. Cancellation TXID: ${cancellationTxid}`);
    
    return {
      success: true,
      cancellationTxid
    };
  } catch (error) {
    console.error(`❌ Transaction cancellation failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Create a cancellation transaction that sends funds back to the wallet
 * This replaces the original transaction by spending its inputs and sending
 * the funds to a new address in the wallet (minus fees)
 */
async function createCancellationTransaction(
  originalTx: any,
  utxos: UTXO[],
  mnemonic: string,
  walletAddresses: string[]
): Promise<RBFTransaction> {
  try {
    console.log(`🔧 Creating cancellation transaction for: ${originalTx.txid}`);
    
    // Ensure ECC is initialized
    await ensureECC();
    
    // Import required libraries
    const bitcoin = require('bitcoinjs-lib');
    const ecc = (global as any).ecc;
    
    // Ensure bip32 module is loaded
    if (!bip32Module) {
      bip32Module = await loadBip32Module();
    }
    
    if (!bip32Module || !(bip32Module as any).BIP32Factory) {
      throw new Error('BIP32 module or BIP32Factory not available');
    }
    const bip32 = bip32Module as any;
    const bip39 = require('bip39');
    
    if (!ecc) {
      throw new Error('ECC library not available');
    }

    // Validate ECC library and initialize bitcoinjs-lib using shared utilities
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
      bitcoin.initEccLib(ecc);
      console.log('✅ bitcoinjs-lib initialized with ECC successfully');
    } catch (initError) {
      console.error('❌ Failed to initialize bitcoinjs-lib with ECC:', initError);
      throw new Error(`Failed to initialize bitcoinjs-lib: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
    }
    const bip32Instance = bip32.BIP32Factory(ecc);
    
    // Create transaction builder (replace TransactionBuilder with PSBT for modern bitcoinjs-lib)
    // TransactionBuilder is deprecated in newer versions of bitcoinjs-lib. Consider migrating to PSBT (Partially Signed Bitcoin Transaction) for better compatibility and future-proofing.
    let txb = new bitcoin.TransactionBuilder(bitcoin.networks.bitcoin);
    
    // Get our inputs from the original transaction
    const walletAddressesSet = new Set(walletAddresses);
    const ourInputs = originalTx.vin?.filter((input: any) => {
      return input.prevout?.scriptpubkey_address && 
             walletAddressesSet.has(input.prevout.scriptpubkey_address);
    });
    
    if (!ourInputs || ourInputs.length === 0) {
      throw new Error('No inputs found for this wallet');
    }
    
    // Calculate total input value
    let totalInputValue = 0;
    const inputMap = new Map<string, { input: any; utxo: UTXO; addressIndex: number; chain: number }>();
    
    for (const input of ourInputs) {
      const address = input.prevout.scriptpubkey_address;
      
      // Derive the actual BIP32 address index and chain instead of using array index
      const { index: addressIndex, chain } = await deriveAddressIndexAndChainFromAddress(mnemonic, address);
      
      // Find the corresponding UTXO
      const utxo = utxos.find(u => {
        const txidMatch = u.txid === input.txid;
        const voutMatch = u.vout === input.vout;
        const addressMatch = u.address === address || !u.address;
        return txidMatch && voutMatch && addressMatch;
      });
      
      if (!utxo) {
        throw new Error(`UTXO not found for input ${input.txid}:${input.vout}`);
      }
      
      // Ensure the UTXO has the correct address for signing
      if (!utxo.address) {
        utxo.address = address;
      }
      
      totalInputValue += utxo.value;
      inputMap.set(`${input.txid}:${input.vout}`, {
        input,
        utxo,
        addressIndex,
        chain
      });
    }
    
    // Add inputs with RBF enabled (sequence number 0xFFFFFFFD)
    for (const [, { utxo }] of inputMap) {
      txb.addInput(utxo.txid, utxo.vout, 0xFFFFFFFD);
    }
    
    // Generate a new address in the wallet for the cancellation
    // Use proper address index calculation to avoid reuse
    const cancellationAddress = await generateCancellationAddress(mnemonic, walletAddresses);
    
    // Calculate fee for cancellation transaction
    // Fix: Calculate the original fee using only our inputs and outputs (consistent with totalInputValue)
    // This ensures we're comparing apples to apples when calculating the cancellation fee
    
    // Calculate total output value that our wallet contributed to in the original transaction
    let ourOriginalOutputValue = 0;
    for (const output of originalTx.vout) {
      // Only count outputs that go to our wallet addresses
      if (output.scriptpubkey_address && walletAddressesSet.has(output.scriptpubkey_address)) {
        ourOriginalOutputValue += output.value;
      }
    }
    
    // Calculate the fee that our wallet paid in the original transaction
    // This is the difference between our inputs and our outputs
    const originalFee = totalInputValue - ourOriginalOutputValue;
    
    // Calculate the number of outputs that our wallet contributed to
    // This should match the scope of ourOriginalOutputValue calculation
    let ourOutputCount = 0;
    for (const output of originalTx.vout) {
      if (output.scriptpubkey_address && walletAddressesSet.has(output.scriptpubkey_address)) {
        ourOutputCount++;
      }
    }
    
    // Estimate transaction size based on our inputs and our outputs only
    // This ensures consistency with the fee calculation scope
    const originalSize = estimateTransactionSize(ourInputs.length, ourOutputCount);
    const originalFeeRate = originalSize > 0 ? originalFee / originalSize : 0;
    
    // Calculate cancellation transaction size (single output)
    const cancellationSize = estimateTransactionSize(ourInputs.length, 1); // Single output for cancellation
    
    // Calculate minimum fee increase required for RBF (10% of original fee)
    const minFeeIncrease = Math.ceil(originalFee * 0.1); // 10% increase minimum for RBF
    const minCancellationFee = originalFee + minFeeIncrease;
    
    // Calculate fee rate that meets the absolute fee increase requirement
    const minCancellationFeeRate = minCancellationFee / cancellationSize;
    
    // Use a fee rate that's at least 2 sat/vB higher than original, but must meet absolute fee increase
    const cancellationFeeRate = Math.max(
      Math.max(originalFeeRate + 2, minCancellationFeeRate), // Meet both rate and absolute requirements
      10 // Minimum 10 sat/vB
    );
    
    const cancellationFee = Math.ceil(cancellationFeeRate * cancellationSize);
    
    // Ensure the cancellation fee meets RBF absolute fee increase requirements
    const actualCancellationFee = Math.max(cancellationFee, minCancellationFee);
    
    // Calculate amount to send back (total input minus actual fee)
    const cancellationAmount = totalInputValue - actualCancellationFee;
    
    if (cancellationAmount <= 546) { // Dust threshold
      throw new Error('Cancellation amount would be below dust threshold. Cannot cancel this transaction.');
    }
    
    // Add output to cancellation address
    txb.addOutput(cancellationAddress, cancellationAmount);
    
    const actualCancellationFeeRate = actualCancellationFee / cancellationSize;
    
    console.log(`💰 Cancellation details:`);
    console.log(`   Our inputs: ${totalInputValue} sats`);
    console.log(`   Our outputs in original: ${ourOriginalOutputValue} sats (${ourOutputCount} outputs)`);
    console.log(`   Original fee (our portion): ${originalFee} sats (${originalFeeRate.toFixed(2)} sat/vB)`);
    console.log(`   Original size (our portion): ${originalSize} vB, Cancellation size: ${cancellationSize} vB`);
    console.log(`   Minimum fee increase required: ${minFeeIncrease} sats`);
    console.log(`   Cancellation fee: ${actualCancellationFee} sats (${actualCancellationFeeRate.toFixed(2)} sat/vB)`);
    console.log(`   Amount to wallet: ${cancellationAmount} sats`);
    console.log(`   Cancellation address: ${cancellationAddress}`);
    
    // Sign the transaction
    console.log(`🔐 Signing cancellation transaction...`);
    
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32Instance.fromSeed(seed);
    
    // Sign each input
    let inputIndex = 0;
    for (const [, { utxo, addressIndex, chain }] of inputMap) {
      // Derive private key for this address using the correct chain
      // Chain 0 = external/receiving addresses, Chain 1 = internal/change addresses
      const child = root.derivePath(`m/84'/0'/0'/${chain}/${addressIndex}`);
      
      if (!child.privateKey) {
        throw new Error(`Failed to derive private key for chain ${chain}, address index ${addressIndex}`);
      }
      
      // Sign the input
      txb.sign(inputIndex, child, null, bitcoin.Transaction.SIGHASH_ALL, utxo.value);
      inputIndex++;
    }
    
    // Build the transaction
    const cancellationTx = txb.build();
    const txHex = cancellationTx.toHex();
    
    console.log(`✅ Cancellation transaction created: ${txHex.substring(0, 100)}...`);
    
    return {
      txid: originalTx.txid,
      originalTx: originalTx as any,
      newFeeRate: actualCancellationFeeRate,
      newFee: actualCancellationFee,
      replacementTx: txHex,
      status: 'pending'
    };
  } catch (error) {
    console.error(`❌ Failed to create cancellation transaction:`, error);
    throw error;
  }
}

// Address derivation utilities and estimateTransactionSize are imported from ecc-utils.ts
// Re-export clearAddressIndexCache for backward compatibility
export { clearAddressIndexCache };
