/**
 * Improved Wallet Service with Address Discovery
 * Uses BIP32 derivation and gap limit for proper address discovery
 */

import type { Transaction, Wallet } from '../types/wallet';
import { ensureECC } from './bitcoin-service';
import { esploraGet, getAddressStats, getAddressTransactions, getAddressUTXOs, getBTCPrice, getCurrentBlockHeight } from './esplora-service';

// Import bip39 with better error handling
let bip39: any;
try {
  bip39 = require('bip39');
} catch (error) {
  bip39 = null;
}

const GAP_LIMIT = 20; // Standard gap limit for address discovery

/**
 * Generate P2WPKH address from public key
 */
async function getP2wpkhAddress(pubKey: Buffer): Promise<string> {
  try {
    // Use bitcoinjs-lib for reliable P2WPKH address generation
    const bitcoin = require('bitcoinjs-lib');
    
    // Create P2WPKH address from public key
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: pubKey,
      network: bitcoin.networks.bitcoin
    });
    
    return address;
  } catch (error) {
    console.error('❌ Failed to generate P2WPKH address:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Address generation failed: ${message}`);
  }
}

/**
 * Derive a batch of addresses for a given chain (external/internal)
 */
async function deriveAddressBatch(node: any, chain: number, from: number, to: number): Promise<string[]> {
  const addresses: string[] = [];
  const chainNode = node.derive(chain);
  
  for (let i = from; i < to; i++) {
    try {
      const childNode = chainNode.derive(i);
      if (childNode.publicKey) {
        const address = await getP2wpkhAddress(childNode.publicKey);
        addresses.push(address);
      }
    } catch (error) {
      console.warn(`Failed to derive address at index ${i}:`, error);
    }
  }
  
  return addresses;
}

/**
 * Discover used addresses using BIP32 derivation with gap limit
 */
export async function discoverUsedAddresses(xpub: string): Promise<string[]> {
  console.log(`🔍 Starting address discovery for xpub: ${xpub.substring(0, 20)}...`);
  
  try {
    await ensureECC();
    
    // Import bip32 dynamically
    const bip32Module = await import('bip32');
    const ecc = (global as any).ecc;
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    const node = bip32.fromBase58(xpub);
    let allUsedAddresses: string[] = [];

    // Test provider connectivity first
    try {
      await esploraGet(`/blocks/tip/height`, 60000);
      console.log(`✅ Provider connectivity confirmed`);
    } catch (e) {
      throw new Error('Upstream data provider is temporarily unavailable. Please try again in a moment.');
    }

    // Check both external (0) and internal (1) chains
    for (const chain of [0, 1]) {
      console.log(`🔍 Checking ${chain === 0 ? 'external' : 'internal'} chain...`);
      let gap = 0;
      let index = 0;
      
      while (gap < GAP_LIMIT) {
        const batch = await deriveAddressBatch(node, chain, index, index + GAP_LIMIT);
        console.log(`🔍 Checking batch ${index}-${index + GAP_LIMIT - 1} (${batch.length} addresses)`);
        
        // Query the batch with controlled concurrency
        const addressTxs = await Promise.all(
          batch.map(async (addr, i) => {
            try {
              const result = await esploraGet(`/address/${addr}/txs`, 300000);
              console.log(`📊 Address ${index + i}: ${Array.isArray(result) ? result.length : 0} transactions`);
              return result;
            } catch (error) {
              console.warn(`⚠️ Failed to check address ${index + i}:`, error);
              return [];
            }
          })
        );
        
        // Process addresses in order and track gap correctly
        for (let i = 0; i < addressTxs.length; i++) {
          if (addressTxs[i] && Array.isArray(addressTxs[i]) && addressTxs[i].length > 0) {
            allUsedAddresses.push(batch[i]);
            gap = 0; // Reset gap when we find a used address
            console.log(`✅ Found used address at index ${index + i}: ${batch[i]}`);
          } else {
            gap++; // Increment gap for unused address
            console.log(`🔍 Address ${index + i} unused, gap: ${gap}`);
          }
        }
        
        // Check if we've reached the gap limit
        if (gap >= GAP_LIMIT) {
          console.log(`🔍 Gap limit reached for ${chain === 0 ? 'external' : 'internal'} chain at index ${index + gap - 1}`);
          break;
        }

        index += GAP_LIMIT;
      }
    }
    
    const uniqueAddresses = Array.from(new Set(allUsedAddresses));
    console.log(`✅ Address discovery complete: ${uniqueAddresses.length} used addresses found`);
    console.log(`📋 Used addresses:`, uniqueAddresses.map(addr => addr.substring(0, 10) + '...'));
    
    return uniqueAddresses;
  } catch (error) {
    console.error(`❌ Address discovery failed:`, error);
    throw error;
  }
}

/**
 * Get comprehensive wallet data using address discovery
 */
export async function getWalletData(xpub: string): Promise<{ data: any | null; error: string | null }> {
  try {
    console.log(`🔄 Getting wallet data for xpub: ${xpub.substring(0, 20)}...`);
    
    // Discover used addresses
    const usedAddresses = await discoverUsedAddresses(xpub);
    
    if (usedAddresses.length === 0) {
      return { 
        data: null, 
        error: 'This xpub key has no transaction history. No used addresses were discovered.' 
      };
    }

    console.log(`📊 Processing ${usedAddresses.length} used addresses...`);

    // Get current price and block height
    const [btcPriceResult, blockHeightResult] = await Promise.all([
      getBTCPrice(),
      getCurrentBlockHeight()
    ]);

    if (!btcPriceResult.data) {
      return { data: null, error: 'Could not fetch BTC price data' };
    }

    const btcPrice = Number(btcPriceResult.data);
    const latestBlockHeight = Number(blockHeightResult.data);

    // Fetch data for all used addresses with controlled concurrency
    const concurrency = 1; // Very low concurrency to avoid rate limiting
    let idx = 0;
    const allTxs = new Map<string, any>();
    const utxos: any[] = [];
    const addressInfos: any[] = [];

    const worker = async () => {
      while (idx < usedAddresses.length) {
        const address = usedAddresses[idx++];
        try {
          console.log(`📊 Processing address ${idx}/${usedAddresses.length}: ${address.substring(0, 10)}...`);
          
          const [txsResult, utxosResult, statsResult] = await Promise.all([
            getAddressTransactions(address),
            getAddressUTXOs(address),
            getAddressStats(address)
          ]);

          if (txsResult.data && Array.isArray(txsResult.data)) {
            txsResult.data.forEach((tx: any) => allTxs.set(tx.txid, tx));
          }

          if (utxosResult.data && Array.isArray(utxosResult.data)) {
            utxosResult.data.forEach((utxo: any) => {
              utxos.push({ txid: utxo.txid, vout: utxo.vout, address, value: utxo.value });
            });
          }

          if (statsResult.data && statsResult.data.chain_stats?.tx_count > 0) {
            addressInfos.push({
              address,
              n_tx: statsResult.data.chain_stats.tx_count,
              balance: statsResult.data.chain_stats.funded_txo_sum - statsResult.data.chain_stats.spent_txo_sum,
            });
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.warn(`⚠️ Failed to process address ${address}:`, error);
        }
      }
    };

    // Run workers with controlled concurrency
    await Promise.all(Array.from({ length: Math.min(concurrency, usedAddresses.length) }, () => worker()));

    console.log(`📊 Collected ${allTxs.size} unique transactions and ${utxos.length} UTXOs`);

    // Process transactions
    const transactions: Transaction[] = Array.from(allTxs.values()).map((tx: any): Transaction => {
      let netAmountSatoshis = 0;
      const ourAddressesSet = new Set(usedAddresses);

      // Calculate net amount for this wallet
      tx.vout.forEach((out: any) => {
        if (out.scriptpubkey_address && ourAddressesSet.has(out.scriptpubkey_address)) {
          netAmountSatoshis += out.value;
        }
      });
      
      tx.vin.forEach((inp: any) => {
        if (inp.prevout?.scriptpubkey_address && ourAddressesSet.has(inp.prevout.scriptpubkey_address)) {
          netAmountSatoshis -= inp.prevout.value;
        }
      });

      const netBtc = netAmountSatoshis / 1e8;
      const isConfirmed = tx.status?.confirmed || false;
      const confirmations = isConfirmed && latestBlockHeight ? latestBlockHeight - tx.status.block_height + 1 : 0;
      const txDate = isConfirmed ? new Date(tx.status.block_time * 1000) : new Date();

      const fromAddress = tx.vin?.map((i: any) => i.prevout?.scriptpubkey_address).filter(Boolean) ?? [];
      const toAddress = tx.vout?.map((o: any) => o.scriptpubkey_address).filter(Boolean) ?? [];

      return {
        txid: tx.txid,
        type: netBtc >= 0 ? 'received' : 'sent',
        amount: Math.abs(netBtc),
        amountUSD: Math.abs(netBtc) * btcPrice,
        address: netBtc >= 0 
          ? (tx.vout?.find((output: any) => ourAddressesSet.has(output.scriptpubkey_address))?.scriptpubkey_address || usedAddresses[0])
          : (tx.vin?.find((input: any) => ourAddressesSet.has(input.prevout?.scriptpubkey_address))?.prevout?.scriptpubkey_address || usedAddresses[0]),
        timestamp: txDate.getTime(),
        confirmations,
        status: isConfirmed ? 'confirmed' : 'pending',
      };
    });

    // Sort by timestamp (newest first)
    transactions.sort((a, b) => b.timestamp - a.timestamp);

    // Calculate balance
    const balanceBTC = utxos.reduce((sum, utxo) => sum + utxo.value, 0) / 1e8;

    const walletData = {
      balanceBTC,
      balanceUSD: balanceBTC * btcPrice,
      transactions: transactions.slice(0, 50), // Limit to 50 most recent
      usedAddresses,
      addressCount: addressInfos.length,
      utxoCount: utxos.length,
    };

    console.log(`✅ Wallet data processed: ${transactions.length} transactions, ${balanceBTC.toFixed(8)} BTC balance`);
    
    return { data: walletData, error: null };
  } catch (error) {
    console.error(`❌ Failed to get wallet data:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Generate a new address from xpub
 */
export async function generateAddressFromXpub(xpub: string, index: number): Promise<string> {
  try {
    await ensureECC();
    
    const bip32Module = await import('bip32');
    const ecc = (global as any).ecc;
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    const node = bip32.fromBase58(xpub);
    // Fix: Include change level (chain 0 for external addresses) in BIP84 derivation path
    const child = node.derive(0).derive(index);
    
    if (!child.publicKey) {
      throw new Error('Failed to derive public key from xpub');
    }
    
    // Use proper P2WPKH address generation
    const bech32 = await import('bech32');
    const { sha256 } = await import('@noble/hashes/sha256');
    const { ripemd160 } = await import('@noble/hashes/ripemd160');
    
    const sha256Hash = sha256(child.publicKey);
    const hash160 = ripemd160(sha256Hash);
    const words = bech32.bech32.toWords(hash160);
    const address = bech32.bech32.encode('bc', [0, ...words]);
    
    console.log(`✅ Generated address for index ${index}: ${address}`);
    return address;
  } catch (error) {
    console.error(`❌ Failed to generate address:`, error);
    throw error;
  }
}

/**
 * Generate a new mnemonic phrase
 */
export const generateMnemonic = async (strength: number = 128): Promise<string> => {
  if (!bip39) {
    throw new Error('BIP39 library not available');
  }
  
  try {
    const mnemonic = bip39.generateMnemonic(strength);
    console.log('✅ Generated mnemonic phrase');
    return mnemonic;
  } catch (error) {
    console.error('❌ Failed to generate mnemonic:', error);
    throw new Error('Failed to generate mnemonic phrase');
  }
};

/**
 * Validate a mnemonic phrase
 */
export const validateMnemonic = (mnemonic: string): boolean => {
  if (!bip39) {
    console.warn('BIP39 library not available for validation');
    return false;
  }
  
  try {
    const isValid = bip39.validateMnemonic(mnemonic);
    console.log('✅ Mnemonic validation result:', isValid);
    return isValid;
  } catch (error) {
    console.error('❌ Mnemonic validation failed:', error);
    return false;
  }
};

/**
 * Create a new wallet from mnemonic
 */
export const createWallet = async (name: string, color: string = '#8B5CF6'): Promise<Wallet> => {
  try {
    console.log('🔧 Creating new wallet:', name);
    
    const mnemonic = await generateMnemonic();
    const wallet = await importWallet(name, mnemonic, color);
    
    console.log('✅ Wallet created successfully');
    return wallet;
  } catch (error) {
    console.error('❌ Failed to create wallet:', error);
    throw error;
  }
};

/**
 * Import wallet from mnemonic
 */
export const importWallet = async (name: string, mnemonic: string, color: string = '#8B5CF6'): Promise<Wallet> => {
  try {
    console.log('🔧 Importing wallet:', name);
    
    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }
    
    await ensureECC();
    
    // Check ECC availability
    const ecc = (global as any).ecc;
    if (!ecc) {
      throw new Error('ECC library not available');
    }
    
    console.log('🔧 ECC library available:', typeof ecc, Object.keys(ecc));
    
    // Generate xpub from mnemonic
    const bip32Module = await import('bip32');
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    console.log('🔧 BIP32 factory created');
    
    const seed = await bip39.mnemonicToSeed(mnemonic);
    console.log('🔧 Seed generated, length:', seed.length);
    
    const root = bip32.fromSeed(seed);
    console.log('🔧 Root node created');
    
    // Derive xpub for P2WPKH (BIP84) first, then convert to zpub
    console.log('🔧 Deriving path m/84\'/0\'/0\'...');
    const derivedNode = root.derivePath("m/84'/0'/0'");
    console.log('🔧 Derived node created');
    
    const neuteredNode = derivedNode.neutered();
    console.log('🔧 Neutered node created');
    
    // Generate xpub first
    const xpub = neuteredNode.toBase58();
    console.log('✅ Generated xpub:', xpub.substring(0, 20) + '...');
    
    // For now, use xpub with BIP84 derivation path
    // The derivation path is what matters most for compatibility
    // We'll store it as xpub but with the correct BIP84 path
    const zpub = xpub;
    console.log('🔧 Using xpub with BIP84 derivation path (m/84\'/0\'/0\')');
    console.log('🔧 This generates the same addresses as zpub format');
    console.log('🔧 The derivation path m/84\'/0\'/0\' is what determines address compatibility');
    
    console.log('🔍 Generated zpub:', zpub);
    console.log('🔍 Zpub length:', zpub.length);
    console.log('🔍 Zpub starts with:', zpub.substring(0, 10));
    
    // Generate initial addresses using zpub
    const addresses: string[] = [];
    for (let i = 0; i < 1; i++) {
      const address = await generateAddressFromXpub(zpub, i);
      console.log(`🔍 Generated address ${i}:`, address);
      addresses.push(address);
    }
    
    const wallet: Wallet = {
      id: Date.now().toString(),
      name,
      color,
      addressType: 'p2wpkh',
      mnemonic,
      xpub: zpub, // Store zpub instead of xpub
      addresses,
      currentAddressIndex: 0,
      balance: 0,
      balanceUSD: 0,
      derivationPath: "m/84'/0'/0'",
      gap: 20,
      createdAt: Date.now(),
      type: 'segwit-native',
    };
    
    console.log('✅ Wallet imported successfully');
    return wallet;
  } catch (error) {
    console.error('❌ Failed to import wallet:', error);
    throw error;
  }
};

/**
 * Check if an address is already in the wallet's address list
 */
export async function isAddressInWallet(wallet: Wallet, address: string): Promise<boolean> {
  return wallet.addresses.includes(address);
}

/**
 * Find the next unused address index using gap limit logic with cycling
 * Discovers up to GAP_LIMIT unused addresses, then cycles through them
 */
export async function findNextUnusedAddressIndexWithCycling(xpub: string, wallet: Wallet): Promise<number> {
  console.log(`🔍 Finding next unused address with gap limit cycling for wallet: ${wallet.name}`);
  
  try {
    await ensureECC();
    
    // Import bip32 dynamically
    const bip32Module = await import('bip32');
    const ecc = (global as any).ecc;
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    const node = bip32.fromBase58(xpub);
    const externalChain = node.derive(0); // External chain (receiving addresses)
    
    // Discover used addresses to find the gap
    const usedAddresses = await discoverUsedAddresses(xpub);
    console.log(`📊 Found ${usedAddresses.length} used addresses`);
    
    // Create a set of used addresses for fast lookup
    const usedAddressesSet = new Set(usedAddresses);
    
    // Find the first unused address after the last used address
    let firstUnusedIndex = 0;
    if (usedAddresses.length > 0) {
      // Find the highest used index by checking addresses in batches
      const maxCheckIndex = Math.min(usedAddresses.length * 10, 1000); // Reasonable upper bound
      let maxUsedIndex = -1;
      
      const batchSize = 20;
      for (let startIndex = 0; startIndex < maxCheckIndex; startIndex += batchSize) {
        const endIndex = Math.min(startIndex + batchSize, maxCheckIndex);
        const batch = await deriveAddressBatch(node, 0, startIndex, endIndex);
        
        for (let i = 0; i < batch.length; i++) {
          const address = batch[startIndex + i];
          if (usedAddressesSet.has(address)) {
            maxUsedIndex = Math.max(maxUsedIndex, startIndex + i);
          }
        }
      }
      
      firstUnusedIndex = maxUsedIndex + 1;
    }
    
    console.log(`🔍 First unused address index: ${firstUnusedIndex}`);
    
    // Find the next GAP_LIMIT unused addresses
    const unusedAddresses: number[] = [];
    const batchSize = Math.min(GAP_LIMIT, 10);
    
    for (let i = firstUnusedIndex; i < firstUnusedIndex + GAP_LIMIT; i += batchSize) {
      const batch = await deriveAddressBatch(node, 0, i, i + batchSize);
      
      for (let j = 0; j < batch.length && unusedAddresses.length < GAP_LIMIT; j++) {
        const address = batch[j];
        const addressIndex = i + j;
        
        // Skip known used addresses
        if (usedAddressesSet.has(address)) {
          continue;
        }
        
        try {
          const result = await esploraGet(`/address/${address}/txs`, 30000);
          const hasTransactions = result && Array.isArray(result) && result.length > 0;
          
          if (!hasTransactions) {
            unusedAddresses.push(addressIndex);
            console.log(`✅ Found unused address at index ${addressIndex}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to check address ${addressIndex}:`, error);
          // Treat as unused if we can't check
          unusedAddresses.push(addressIndex);
        }
      }
    }
    
    console.log(`📊 Found ${unusedAddresses.length} unused addresses:`, unusedAddresses);
    
    if (unusedAddresses.length === 0) {
      console.log(`⚠️ No unused addresses found, returning first unused index`);
      return firstUnusedIndex;
    }
    
    // Find the next unused address to use (cycling through the unused addresses)
    const currentIndex = wallet.currentAddressIndex;
    
    // If current index is not in our unused addresses list, start from the first unused
    if (!unusedAddresses.includes(currentIndex)) {
      const nextUnusedIndex = unusedAddresses[0];
      console.log(`✅ Current index ${currentIndex} not in unused list, using first unused: ${nextUnusedIndex}`);
      return nextUnusedIndex;
    }
    
    // Find the next unused address after current, or cycle back to first
    const currentPosition = unusedAddresses.indexOf(currentIndex);
    const nextPosition = (currentPosition + 1) % unusedAddresses.length;
    const nextUnusedIndex = unusedAddresses[nextPosition];
    
    console.log(`✅ Cycling through unused addresses: ${currentIndex} -> ${nextUnusedIndex}`);
    return nextUnusedIndex;
  } catch (error) {
    console.error(`❌ Failed to find next unused address with cycling:`, error);
    // Fallback to simple increment
    return wallet.currentAddressIndex + 1;
  }
}

/**
 * Generate a new address for the wallet using simple cycling pattern
 */
export const generateNewAddress = async (wallet: Wallet): Promise<Wallet> => {
  try {
    console.log('🔧 Generating new address for wallet:', wallet.name);
    
    // Find the next address index using cycling logic (0-19)
    const nextIndex = await findNextUnusedAddressIndexWithCycling(wallet.xpub, wallet);
    const newAddress = await generateAddressFromXpub(wallet.xpub, nextIndex);
    
    // Check if this address already exists in the wallet's address list
    const isDuplicate = wallet.addresses.includes(newAddress);
    if (isDuplicate) {
      console.warn(`⚠️ Generated address is already in wallet, cycling to next index`);
      // Cycle to the next index
      const nextCycledIndex = (nextIndex + 1) % 20;
      const alternativeAddress = await generateAddressFromXpub(wallet.xpub, nextCycledIndex);
      
      const updatedWallet = {
        ...wallet,
        addresses: [...wallet.addresses, alternativeAddress],
        currentAddressIndex: nextCycledIndex,
      };
      
      console.log(`✅ Alternative address generated at index ${nextCycledIndex}:`, alternativeAddress);
      return updatedWallet;
    }
    
    // Update wallet with new address
    const updatedWallet = {
      ...wallet,
      addresses: [...wallet.addresses, newAddress],
      currentAddressIndex: nextIndex,
    };
    
    console.log(`✅ New address generated at index ${nextIndex}:`, newAddress);
    return updatedWallet;
  } catch (error) {
    console.error('❌ Failed to generate new address:', error);
    throw error;
  }
};

/**
 * Generate addresses for view addresses screen following gap limit logic
 * Returns addresses with their usage status following BIP44 gap limit rules
 * Discovers all used addresses and stops only when encountering GAP_LIMIT consecutive unused addresses
 * This ensures no used addresses are missed, regardless of chain type (receiving/change)
 */
export async function generateAddressesForView(xpub: string, chainType: 'receiving' | 'change' = 'receiving'): Promise<Array<{address: string, index: number, isUsed: boolean, balance: number, txCount: number, type: 'receiving' | 'change'}>> {
  console.log(`🔍 Generating addresses for view: ${chainType} chain`);
  
  try {
    await ensureECC();
    
    // Import bip32 dynamically
    const bip32Module = await import('bip32');
    const ecc = (global as any).ecc;
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    const node = bip32.fromBase58(xpub);
    const chain = chainType === 'receiving' ? 0 : 1; // External (0) or Internal (1) chain
    
    let allAddresses: Array<{address: string, index: number, isUsed: boolean, balance: number, txCount: number, type: 'receiving' | 'change'}> = [];
    let gap = 0;
    let index = 0;
    
    console.log(`🔍 Starting ${chainType} address discovery with gap limit ${GAP_LIMIT}`);
    
    // Discover addresses following BIP44 gap limit logic
    // Stop only when we encounter GAP_LIMIT consecutive unused addresses
    while (gap < GAP_LIMIT) {
      const batchSize = Math.min(GAP_LIMIT, 20); // Check in batches for efficiency
      const batch = await deriveAddressBatch(node, chain, index, index + batchSize);
      
      console.log(`🔍 Checking ${chainType} batch ${index}-${index + batchSize - 1} (${batch.length} addresses)`);
      
      // Check each address in the batch
      for (let i = 0; i < batch.length; i++) {
        const address = batch[i];
        const addressIndex = index + i;
        
        try {
          // Check if address has any transactions and get balance
          const [txsResult, statsResult] = await Promise.all([
            esploraGet(`/address/${address}/txs`, 30000),
            getAddressStats(address)
          ]);
          
          const hasTransactions = txsResult && Array.isArray(txsResult) && txsResult.length > 0;
          const txCount = hasTransactions ? txsResult.length : 0;
          
          // Extract balance from stats
          const balance = statsResult.data?.chain_stats ? 
            (statsResult.data.chain_stats.funded_txo_sum - statsResult.data.chain_stats.spent_txo_sum) / 1e8 : 0;
          
          const isUsed = hasTransactions || balance > 0;
          
          const addressData = {
            address,
            index: addressIndex,
            isUsed,
            balance,
            txCount,
            type: chainType
          };
          
          allAddresses.push(addressData);
          
          if (isUsed) {
            gap = 0; // Reset gap when we find a used address
            console.log(`✅ Found used ${chainType} address at index ${addressIndex}: ${hasTransactions ? `${txCount} txs` : `${balance.toFixed(8)} BTC`}`);
          } else {
            gap++; // Increment gap for unused address
            console.log(`🔍 ${chainType} address ${addressIndex} unused, gap: ${gap}`);
            
            // Stop if we've reached the gap limit (consecutive unused addresses)
            if (gap >= GAP_LIMIT) {
              console.log(`🔍 Gap limit (${gap}) reached for ${chainType} chain`);
              break;
            }
          }
          
        } catch (error) {
          console.warn(`⚠️ Failed to check ${chainType} address ${addressIndex}:`, error);
          // Treat as unused if we can't check
          allAddresses.push({
            address,
            index: addressIndex,
            isUsed: false,
            balance: 0,
            txCount: 0,
            type: chainType
          });
          gap++;
          
          // Stop if we've reached the gap limit
          if (gap >= GAP_LIMIT) {
            console.log(`🔍 Gap limit (${gap}) reached for ${chainType} chain after error`);
            break;
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Check if we've reached the gap limit
      if (gap >= GAP_LIMIT) {
        console.log(`🔍 Gap limit (${gap}) reached for ${chainType} chain`);
        break;
      }
      
      index += batchSize;
    }
    
    console.log(`✅ Generated ${allAddresses.length} ${chainType} addresses for view (${allAddresses.filter(a => a.isUsed).length} used, ${allAddresses.filter(a => !a.isUsed).length} unused)`);
    return allAddresses;
  } catch (error) {
    console.error(`❌ Failed to generate addresses for view:`, error);
    throw error;
  }
}

/**
 * Generate addresses in batches for view addresses screen (DEPRECATED - use generateAddressesForView instead)
 * Returns addresses with their usage status
 */
export async function generateAddressBatchForView(xpub: string, startIndex: number, batchSize: number = 20): Promise<Array<{address: string, index: number, isUsed: boolean, balance: number, txCount: number}>> {
  console.log(`🔍 Generating address batch for view: start=${startIndex}, size=${batchSize}`);
  
  try {
    await ensureECC();
    
    // Import bip32 dynamically
    const bip32Module = await import('bip32');
    const ecc = (global as any).ecc;
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    const node = bip32.fromBase58(xpub);
    const batch = await deriveAddressBatch(node, 0, startIndex, startIndex + batchSize);
    
    const addressData: Array<{address: string, index: number, isUsed: boolean, balance: number, txCount: number}> = [];
    
    // Check each address in the batch
    for (let i = 0; i < batch.length; i++) {
      const address = batch[i];
      const index = startIndex + i;
      
      try {
        // Check if address has any transactions and get balance
        const [txsResult, statsResult] = await Promise.all([
          esploraGet(`/address/${address}/txs`, 30000),
          getAddressStats(address)
        ]);
        
        const hasTransactions = txsResult && Array.isArray(txsResult) && txsResult.length > 0;
        const txCount = hasTransactions ? txsResult.length : 0;
        
        // Extract balance from stats
        const balance = statsResult.data?.chain_stats ? 
          (statsResult.data.chain_stats.funded_txo_sum - statsResult.data.chain_stats.spent_txo_sum) / 1e8 : 0;
        
        addressData.push({
          address,
          index,
          isUsed: hasTransactions || balance > 0,
          balance,
          txCount
        });
        
        console.log(`✅ Address ${index}: ${hasTransactions ? 'used' : 'unused'}, ${txCount} txs, ${balance.toFixed(8)} BTC`);
        
      } catch (error) {
        console.warn(`⚠️ Failed to check address ${index}:`, error);
        // Treat as unused if we can't check
        addressData.push({
          address,
          index,
          isUsed: false,
          balance: 0,
          txCount: 0
        });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Generated ${addressData.length} addresses for view`);
    return addressData;
  } catch (error) {
    console.error(`❌ Failed to generate address batch for view:`, error);
    throw error;
  }
}

/**
 * Get private key for an address
 */
export const getPrivateKey = async (mnemonic: string, addressIndex: number): Promise<string> => {
  try {
    console.log('🔧 Getting private key for address index:', addressIndex);
    
    await ensureECC();
    
    const bip32Module = await import('bip32');
    const ecc = (global as any).ecc;
    const bip32 = bip32Module.BIP32Factory(ecc);
    
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed);
    
    // Derive private key for P2WPKH (BIP84)
    const child = root.derivePath(`m/84'/0'/0'/0/${addressIndex}`);
    
    if (!child.privateKey) {
      throw new Error('Failed to derive private key');
    }
    
    const privateKey = child.privateKey.toString('hex');
    console.log('✅ Private key derived');
    return privateKey;
  } catch (error) {
    console.error('❌ Failed to get private key:', error);
    throw error;
  }
};
