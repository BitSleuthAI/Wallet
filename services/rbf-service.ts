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
      const sequence = parseInt(input.sequence, 16);
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
      const addressIndex = walletAddresses.indexOf(address);
      
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
    
    // Ensure the new fee meets RBF requirements (must be higher than original)
    const minFeeIncrease = Math.ceil(originalFee * 0.1); // 10% increase minimum for RBF
    const actualTargetFee = Math.max(targetFee, originalFee + minFeeIncrease);
    
    const feeIncrease = actualTargetFee - originalFee;
    
    // Validate that the requested fee rate is reasonable
    if (newFeeRate < originalFeeRate) {
      throw new Error(`Requested fee rate (${newFeeRate} sat/vB) is lower than original fee rate (${originalFeeRate.toFixed(2)} sat/vB). RBF requires a higher fee rate.`);
    }
    
    // Check if the fee increase is too small (less than 1 sat/vB improvement)
    const feeRateIncrease = (actualTargetFee / originalSize) - originalFeeRate;
    if (feeRateIncrease < 1) {
      console.warn(`⚠️ Fee rate increase is very small: ${feeRateIncrease.toFixed(2)} sat/vB. This may not be sufficient for RBF.`);
    }
    
    console.log(`💰 Fee calculation: Original fee: ${originalFee} sats (${originalFeeRate.toFixed(2)} sat/vB)`);
    console.log(`💰 Target fee: ${actualTargetFee} sats (${newFeeRate} sat/vB requested)`);
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
