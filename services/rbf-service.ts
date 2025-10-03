/**
 * Replace-by-Fee (RBF) Service
 * Implements RBF functionality using Blockstream API
 */

import { Transaction, UTXO } from '@/types/wallet';
import { ensureECC } from './bitcoin-service';
import { esploraGet } from './esplora-service';

export interface RBFTransaction {
  txid: string;
  originalTx: Transaction;
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
  originalTx?: any;
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
function parseSequenceNumber(sequence: any): number {
  if (typeof sequence === 'number') {
    return sequence;
  }
  
  if (typeof sequence === 'string') {
    // Check if it's a hexadecimal string (prefixed with '0x' or '0X')
    if (sequence.startsWith('0x') || sequence.startsWith('0X')) {
      const parsed = parseInt(sequence, 16);
      if (isNaN(parsed)) {
        console.warn(`⚠️ Failed to parse hexadecimal sequence: ${sequence}`);
        return 0xFFFFFFFF; // Default to non-RBF sequence
      }
      return parsed;
    }
    // Otherwise parse as decimal
    const parsed = parseInt(sequence, 10);
    if (isNaN(parsed)) {
      console.warn(`⚠️ Failed to parse decimal sequence: ${sequence}`);
      return 0xFFFFFFFF; // Default to non-RBF sequence
    }
    return parsed;
  }
  
  // If sequence is not a number or string, try to convert to string first
  const sequenceStr = String(sequence);
  if (sequenceStr.startsWith('0x') || sequenceStr.startsWith('0X')) {
    const parsed = parseInt(sequenceStr, 16);
    if (isNaN(parsed)) {
      console.warn(`⚠️ Failed to parse hexadecimal sequence: ${sequenceStr}`);
      return 0xFFFFFFFF; // Default to non-RBF sequence
    }
    return parsed;
  }
  
  const parsed = parseInt(sequenceStr, 10);
  if (isNaN(parsed)) {
    console.warn(`⚠️ Failed to parse sequence: ${sequenceStr}`);
    return 0xFFFFFFFF; // Default to non-RBF sequence
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
    const bip32Module = await import('bip32');
    const bip39 = require('bip39');
    
    if (!ecc) {
      throw new Error('ECC library not available');
    }
    
    // Initialize bitcoinjs-lib with ECC
    bitcoin.initEccLib(ecc);
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    // Create transaction builder
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
    const inputMap = new Map<string, { input: any; utxo: UTXO; addressIndex: number }>();
    
    for (const input of ourInputs) {
      const address = input.prevout.scriptpubkey_address;
      
      // Derive the actual BIP32 address index instead of using array index
      const addressIndex = await deriveAddressIndexFromAddress(mnemonic, address);
      
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
        addressIndex
      });
    }
    
    // Add inputs with RBF enabled (sequence number 0xFFFFFFFD)
    for (const [key, { input, utxo }] of inputMap) {
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
      totalOutputValue += output.value;
    }
    
    // Find the change output in the original transaction (if any)
    let changeOutputIndex = -1;
    let changeOutputValue = 0;
    
    // Look for a change output (typically the last output that goes to our wallet)
    for (let i = originalTx.vout.length - 1; i >= 0; i--) {
      const output = originalTx.vout[i];
      if (output.scriptpubkey_address && walletAddressesSet.has(output.scriptpubkey_address)) {
        changeOutputIndex = i;
        changeOutputValue = output.value;
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
    const minFeeIncrease = Math.ceil(originalFee * 0.1); // 10% increase minimum for RBF
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
    let actualOutputValue = totalOutputValue;
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
    for (const [key, { input, utxo }] of inputMap) {
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
    const root = bip32.fromSeed(seed);
    
    // Sign each input
    let inputIndex = 0;
    for (const [key, { input, utxo, addressIndex }] of inputMap) {
      // Derive private key for this address
      const child = root.derivePath(`m/84'/0'/0'/0/${addressIndex}`);
      
      if (!child.privateKey) {
        throw new Error(`Failed to derive private key for address index ${addressIndex}`);
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
    const bip32Module = await import('bip32');
    const bip39 = require('bip39');
    
    if (!ecc) {
      throw new Error('ECC library not available');
    }
    
    // Initialize bitcoinjs-lib with ECC
    bitcoin.initEccLib(ecc);
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    // Create transaction builder
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
    const inputMap = new Map<string, { input: any; utxo: UTXO; addressIndex: number }>();
    
    for (const input of ourInputs) {
      const address = input.prevout.scriptpubkey_address;
      
      // Derive the actual BIP32 address index instead of using array index
      const addressIndex = await deriveAddressIndexFromAddress(mnemonic, address);
      
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
        addressIndex
      });
    }
    
    // Add inputs with RBF enabled (sequence number 0xFFFFFFFD)
    for (const [key, { input, utxo }] of inputMap) {
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
    const root = bip32.fromSeed(seed);
    
    // Sign each input
    let inputIndex = 0;
    for (const [key, { input, utxo, addressIndex }] of inputMap) {
      // Derive private key for this address
      const child = root.derivePath(`m/84'/0'/0'/0/${addressIndex}`);
      
      if (!child.privateKey) {
        throw new Error(`Failed to derive private key for address index ${addressIndex}`);
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

// Cache for address-to-index mappings to avoid redundant derivations
const addressIndexCache = new Map<string, number>();

/**
 * Clear the address index cache
 * Call this when switching wallets or when cache becomes stale
 */
export function clearAddressIndexCache(): void {
  addressIndexCache.clear();
  console.log(`🧹 Cleared address index cache`);
}

/**
 * Derive the BIP32 address index from an address by testing derivation paths
 * This is necessary because walletAddresses array order doesn't correspond to BIP32 indices
 * 
 * Performance improvements:
 * 1. Uses caching to avoid redundant derivations
 * 2. Implements optimized linear search with batching
 * 3. Removes arbitrary 1000 address limit
 * 4. Optimizes imports to avoid repeated dynamic imports
 * 5. Adds small delays between batches to prevent UI blocking
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
    
    // Import required libraries once
    const bip32Module = await import('bip32');
    const bip39 = require('bip39');
    const ecc = (global as any).ecc;
    const bip32 = bip32Module.BIP32Factory(ecc);
    const bech32 = await import('bech32');
    const { sha256 } = await import('@noble/hashes/sha256');
    const { ripemd160 } = await import('@noble/hashes/ripemd160');
    
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed);
    const externalChain = root.derivePath(`m/84'/0'/0'/0`);
    
    // Use optimized linear search with batching to prevent UI blocking
    let foundIndex = -1;
    const batchSize = 50; // Smaller batches for better responsiveness
    const batchDelay = 5; // 5ms delay between batches
    let currentIndex = 0;
    const maxSearchRange = 10000; // Reasonable limit for most wallets
    
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
    
    // If not found in the initial range, expand the search with larger delays
    if (foundIndex === -1) {
      console.log(`🔍 Address not found in initial range, expanding search...`);
      
      // Expand search range with larger delays for better responsiveness
      let expandedHigh = maxSearchRange * 2;
      const expandedBatchSize = 25; // Smaller batches for expanded search
      const expandedBatchDelay = 10; // Longer delays for expanded search
      
      while (foundIndex === -1 && expandedHigh <= 100000) { // Cap at 100k for safety
        console.log(`🔍 Searching range ${currentIndex} to ${expandedHigh}...`);
        
        for (let i = currentIndex; i < expandedHigh; i += expandedBatchSize) {
          const endIndex = Math.min(i + expandedBatchSize, expandedHigh);
          
          for (let j = i; j < endIndex; j++) {
            try {
              const child = externalChain.derive(j);
              if (!child.publicKey) continue;
              
              const sha256Hash = sha256(child.publicKey);
              const hash160 = ripemd160(sha256Hash);
              const words = bech32.bech32.toWords(hash160);
              const address = bech32.bech32.encode('bc', [0, ...words]);
              
              if (address === targetAddress) {
                foundIndex = j;
                break;
              }
            } catch (error) {
              console.warn(`⚠️ Failed to derive address at index ${j}:`, error);
              continue;
            }
          }
          
          if (foundIndex !== -1) break;
          
          // Delay between batches in expanded search
          if (endIndex < expandedHigh) {
            await new Promise(resolve => setTimeout(resolve, expandedBatchDelay));
          }
        }
        
        currentIndex = expandedHigh;
        expandedHigh *= 2;
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
 * Find the next unused address index for generating new addresses
 * This ensures we don't reuse addresses and follow proper BIP32 gap limit
 * 
 * Fix: Instead of assuming sequential usage (max + 1), we now find the actual
 * next unused index by checking for gaps in the address sequence. This prevents
 * address reuse when there are gaps in the wallet's address usage.
 * 
 * Performance improvements:
 * 1. Uses cached results from deriveAddressIndexFromAddress
 * 2. Processes addresses sequentially to prevent app freezing
 * 3. Provides better error handling and fallback logic
 * 4. Handles non-sequential address usage properly
 * 5. Uses batching with small delays to prevent UI blocking
 */
export async function findNextUnusedAddressIndex(mnemonic: string, walletAddresses: string[]): Promise<number> {
  try {
    console.log(`🔍 Finding next unused address index for ${walletAddresses.length} addresses...`);
    
    // Process addresses sequentially in small batches to prevent app freezing
    const usedIndices = new Set<number>();
    let successfulDerivations = 0;
    const batchSize = 5; // Process 5 addresses at a time
    const batchDelay = 10; // 10ms delay between batches
    
    for (let i = 0; i < walletAddresses.length; i += batchSize) {
      const batch = walletAddresses.slice(i, i + batchSize);
      
      // Process batch sequentially to avoid overwhelming the system
      for (const address of batch) {
        try {
          const index = await deriveAddressIndexFromAddress(mnemonic, address);
          usedIndices.add(index);
          successfulDerivations++;
        } catch (error) {
          console.warn(`⚠️ Could not derive index for address ${address}:`, error);
        }
      }
      
      // Small delay between batches to prevent UI blocking
      if (i + batchSize < walletAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }
    
    // If we couldn't derive any addresses, fall back to 0
    if (successfulDerivations === 0) {
      console.warn(`⚠️ Could not derive any address indices, using fallback index 0`);
      return 0;
    }
    
    // Find the next unused index by looking for the first gap or the next index after max
    let nextIndex = 0;
    while (usedIndices.has(nextIndex)) {
      nextIndex++;
    }
    
    const maxUsedIndex = Math.max(...usedIndices);
    const hasGaps = nextIndex < maxUsedIndex;
    
    console.log(`✅ Next unused address index: ${nextIndex} (max used: ${maxUsedIndex}, ${successfulDerivations}/${walletAddresses.length} addresses processed${hasGaps ? ', gaps detected' : ''})`);
    return nextIndex;
  } catch (error) {
    console.error(`❌ Failed to find next unused address index:`, error);
    // Fallback to 0 if we can't determine the next index
    console.warn(`⚠️ Using fallback index 0`);
    return 0;
  }
}

/**
 * Generate a cancellation address using the wallet's derivation path
 */
async function generateCancellationAddress(mnemonic: string, walletAddresses: string[]): Promise<string> {
  try {
    console.log(`🔧 Generating cancellation address...`);
    
    // Find the next unused address index instead of using array length
    const addressIndex = await findNextUnusedAddressIndex(mnemonic, walletAddresses);
    
    // Import required libraries
    const bip32Module = await import('bip32');
    const bip39 = require('bip39');
    const ecc = (global as any).ecc;
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    // Derive private key for cancellation address
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(`m/84'/0'/0'/0/${addressIndex}`);
    
    if (!child.publicKey) {
      throw new Error('Failed to derive public key for cancellation address');
    }
    
    // Generate P2WPKH address
    const bech32 = await import('bech32');
    const { sha256 } = await import('@noble/hashes/sha256');
    const { ripemd160 } = await import('@noble/hashes/ripemd160');
    
    const sha256Hash = sha256(child.publicKey);
    const hash160 = ripemd160(sha256Hash);
    const words = bech32.bech32.toWords(hash160);
    const address = bech32.bech32.encode('bc', [0, ...words]);
    
    console.log(`✅ Generated cancellation address: ${address} (index: ${addressIndex})`);
    return address;
  } catch (error) {
    console.error(`❌ Failed to generate cancellation address:`, error);
    throw error;
  }
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
    console.log(`🔧 Generating change address for index: ${changeIndex}`);
    
    // Import required libraries
    const bip32Module = await import('bip32');
    const bip39 = require('bip39');
    const ecc = (global as any).ecc;
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    // Derive private key for change address (chain 1)
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed);
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
