/**
 * Simplified Bitcoin Service - Only Essential Functions
 * Most functionality moved to esplora-service.ts and wallet-service.ts
 */

import { BitcoinPrice, UTXO } from '@/types/wallet';

// Don't initialize ECC at module load time - do it lazily when needed
let eccInitialized = false;

export const ensureECC = async () => {
  console.log('🔧 ensureECC called, eccInitialized:', eccInitialized);
  
  if (eccInitialized) {
    console.log('✅ ECC already initialized, returning');
    return;
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
    
    console.log('🔧 Checking global ECC...');
    const ecc = (global as any).ecc;
    console.log('🔧 Global ECC:', typeof ecc, ecc ? Object.keys(ecc) : 'null');
    
    if (!ecc) {
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
    console.log('🔍 Fetching UTXOs for address:', address.substring(0, 10) + '...');
    
    // Use XMLHttpRequest to avoid polyfill issues
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.timeout = 15000;
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log('✅ UTXOs fetched:', data.length);
              
              const utxos: UTXO[] = data.map((utxo: any) => ({
                txid: utxo.txid,
                vout: utxo.vout,
                value: utxo.value,
                scriptPubKey: utxo.scriptpubkey,
                address: utxo.status?.confirmed ? address : undefined,
                addressIndex: addressIndex, // Include the address index
                status: {
                  confirmed: utxo.status?.confirmed || false,
                  block_height: utxo.status?.block_height,
                  block_hash: utxo.status?.block_hash,
                  block_time: utxo.status?.block_time,
                },
              }));
              
              resolve(utxos);
            } catch (parseError) {
              console.error('❌ Failed to parse UTXO response:', parseError);
              reject(new Error('Failed to parse UTXO data'));
            }
          } else {
            console.error('❌ UTXO fetch failed with status:', xhr.status);
            reject(new Error(`UTXO fetch failed: ${xhr.status}`));
          }
        }
      };
      
      xhr.onerror = () => {
        console.error('❌ UTXO fetch network error');
        reject(new Error('Network error'));
      };
      
      xhr.ontimeout = () => {
        console.error('❌ UTXO fetch timeout');
        reject(new Error('Request timeout'));
      };
      
      // Try Blockstream first, then Mempool.space
      const urls = [
        `https://blockstream.info/api/address/${address}/utxo`,
        `https://mempool.space/api/address/${address}/utxo`
      ];
      
      let urlIndex = 0;
      
      const tryNextUrl = () => {
        if (urlIndex >= urls.length) {
          reject(new Error('All UTXO endpoints failed'));
          return;
        }
        
        console.log('🔍 Trying UTXO URL:', urls[urlIndex]);
        xhr.open('GET', urls[urlIndex], true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.send();
      };
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log('✅ UTXOs fetched:', data.length);
              
              const utxos: UTXO[] = data.map((utxo: any) => ({
                txid: utxo.txid,
                vout: utxo.vout,
                value: utxo.value,
                scriptPubKey: utxo.scriptpubkey,
                address: utxo.status?.confirmed ? address : undefined,
                addressIndex: addressIndex, // Include the address index
                status: {
                  confirmed: utxo.status?.confirmed || false,
                  block_height: utxo.status?.block_height,
                  block_hash: utxo.status?.block_hash,
                  block_time: utxo.status?.block_time,
                },
              }));
              
              resolve(utxos);
            } catch (parseError) {
              console.error('❌ Failed to parse UTXO response:', parseError);
              reject(new Error('Failed to parse UTXO data'));
            }
          } else if (xhr.status >= 500 || xhr.status === 0) {
            // Server error or network issue, try next URL
            console.warn('⚠️ UTXO endpoint failed, trying next...');
            urlIndex++;
            setTimeout(tryNextUrl, 1000);
          } else {
            // Client error (4xx), don't retry
            console.error('❌ UTXO fetch failed with status:', xhr.status);
            reject(new Error(`UTXO fetch failed: ${xhr.status}`));
          }
        }
      };
      
      tryNextUrl();
    });
  } catch (error) {
    console.error('❌ getAddressUTXOs failed:', error);
    throw error;
  }
};

/**
 * Get Bitcoin price (fallback for send screen)
 */
export const getBitcoinPrice = async (): Promise<BitcoinPrice> => {
  try {
    console.log('💲 Fetching Bitcoin price...');
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.timeout = 10000;
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log('✅ Bitcoin price fetched:', data.USD.last);
              
              resolve({
                usd: data.USD.last,
                usd_24h_change: 0, // Not available from this API
              });
            } catch (parseError) {
              console.error('❌ Failed to parse price response:', parseError);
              reject(new Error('Failed to parse price data'));
            }
          } else {
            console.error('❌ Price fetch failed with status:', xhr.status);
            reject(new Error(`Price fetch failed: ${xhr.status}`));
          }
        }
      };
      
      xhr.onerror = () => {
        console.error('❌ Price fetch network error');
        reject(new Error('Network error'));
      };
      
      xhr.ontimeout = () => {
        console.error('❌ Price fetch timeout');
        reject(new Error('Request timeout'));
      };
      
      xhr.open('GET', 'https://blockchain.info/ticker', true);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();
    });
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
    
    let utxosToUse: UTXO[];
    let actualFee: number;
    
    if (selectedUTXOs && selectedUTXOs.length > 0) {
      // Use coin control selected UTXOs
      console.log('🔍 Using coin control selected UTXOs:', selectedUTXOs.length);
      utxosToUse = selectedUTXOs.filter(utxo => utxo.status.confirmed);
      
      if (utxosToUse.length === 0) {
        throw new Error('No confirmed UTXOs in selected set');
      }
      
      // Calculate actual fee for selected UTXOs
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
      
      console.log('✅ Using coin control UTXOs:', utxosToUse.length);
    } else {
      // Get UTXOs from all wallet addresses and select automatically
      console.log('🔍 Fetching UTXOs for transaction...');
      
      let allUtxos: UTXO[] = [];
      
      if (allWalletAddresses && allWalletAddresses.length > 0) {
        // Fetch UTXOs from all wallet addresses
        console.log('🔍 Fetching UTXOs from all wallet addresses:', allWalletAddresses.length);
        
        for (let i = 0; i < allWalletAddresses.length; i++) {
          const address = allWalletAddresses[i];
          try {
            const addressUtxos = await getAddressUTXOs(address, i);
            // Add the address index to each UTXO for proper signing
            const utxosWithIndex = addressUtxos.map(utxo => ({
              ...utxo,
              addressIndex: i
            }));
            allUtxos.push(...utxosWithIndex);
            console.log(`✅ Fetched ${addressUtxos.length} UTXOs from address ${i}`);
          } catch (error) {
            console.warn(`⚠️ Failed to fetch UTXOs from address ${i}:`, error);
            // Continue with other addresses even if one fails
          }
        }
      } else {
        // Fallback to just the from address if no wallet addresses provided
        console.log('⚠️ No wallet addresses provided, falling back to from address only');
        const utxos = await getAddressUTXOs(fromAddress, addressIndex);
        allUtxos = utxos.map(utxo => ({
          ...utxo,
          addressIndex: addressIndex
        }));
      }
      
      if (allUtxos.length === 0) {
        throw new Error('No UTXOs available in wallet');
      }
      
      console.log(`✅ Total UTXOs available: ${allUtxos.length}`);
      
      // Select UTXOs using greedy algorithm
      const selectedUTXOsResult = selectUTXOs(allUtxos, amountSatoshis, feeRate);
      utxosToUse = selectedUTXOsResult.selectedUTXOs;
      actualFee = selectedUTXOsResult.fee;
      console.log('✅ Selected UTXOs:', utxosToUse.length);
    }
    
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
  const availableUTXOs = utxos
    .filter(utxo => utxo.status.confirmed)
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
    
    // Initialize bitcoinjs-lib with ECC
    bitcoin.initEccLib(ecc);
    
    // Create transaction builder
    const txb = new bitcoin.TransactionBuilder(bitcoin.networks.bitcoin);
    
    // Calculate total input value and change
    const totalInputValue = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    const changeAmount = totalInputValue - amountSatoshis - feeAmount;
    
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
    
    // Sign inputs
    console.log('🔐 Signing transaction with private keys...');
    
    // Import bip32 and bip39
    const bip32Module = await import('bip32');
    const bip39 = require('bip39');
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    // Derive root key
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed);
    
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
      const child = root.derivePath(`m/84'/0'/0'/0/${utxoAddressIndex}`);
      
      if (!child.privateKey) {
        throw new Error(`Failed to derive private key for address index ${utxoAddressIndex}`);
      }
      
      // Sign the input with correct parameters for P2WPKH
      // Parameters: (inputIndex, keyPair, redeemScript, hashType, witnessValue)
      txb.sign(i, child, null, bitcoin.Transaction.SIGHASH_ALL, utxo.value);
    }
    
    // Build transaction
    const tx = txb.build();
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
