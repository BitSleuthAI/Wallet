/**
 * Improved Wallet Service with Address Discovery
 * Uses BIP32 derivation and gap limit for proper address discovery
 */

import type { Transaction, Wallet } from '../types/wallet';
import { recordWalletAssociationsXpub } from './address-cache-service';
import { loadBip32Module } from './bip32-loader';
import { ensureECC } from './bitcoin-service';
import { esploraGet, getAddressStats, getAddressTransactions, getAddressUTXOs, getBTCPrice, getCurrentBlockHeight } from './esplora-service';
import { getCacheStats, loadTransactionCache } from './transaction-cache-service';

// Import bip39 with better error handling
let bip39: any;

try {
  bip39 = require('bip39');
  console.log('✅ bip39 loaded at module level:', typeof bip39, bip39 ? Object.keys(bip39).slice(0, 5) : 'null');
} catch (error) {
  console.warn('⚠️ Failed to load bip39 at module level:', error);
  bip39 = null;
}

const GAP_LIMIT = 20; // Standard gap limit for address discovery

// Cache for address metadata to avoid redundant blockchain queries
// Key: xpub, Value: { metadata, timestamp }
const addressMetadataCache: Map<string, { 
  metadata: Array<{ address: string; index: number; chain: number; isUsed: boolean }>, 
  timestamp: number 
}> = new Map();

// Cache TTL: 5 minutes (same as the UI query cache)
const METADATA_CACHE_TTL = 5 * 60 * 1000;

/**
 * Clear the address metadata cache for a specific xpub or all xpubs
 * Useful when user manually refreshes or wants fresh data
 */
export function clearAddressCache(xpub?: string): void {
  if (xpub) {
    addressMetadataCache.delete(xpub);
    console.log(`🗑️ Cleared address cache for xpub: ${xpub.substring(0, 20)}...`);
  } else {
    addressMetadataCache.clear();
    console.log(`🗑️ Cleared all address caches`);
  }
}

/**
 * Generate P2WPKH address from public key
 */
async function getP2wpkhAddress(pubKey: Buffer | Uint8Array): Promise<string> {
  try {
    // Convert Uint8Array to Buffer if needed
    let pubKeyBuffer: Buffer;
    if (pubKey instanceof Uint8Array) {
      pubKeyBuffer = Buffer.from(pubKey);
    } else {
      pubKeyBuffer = pubKey;
    }
    
    // Use bitcoinjs-lib for reliable P2WPKH address generation
    const bitcoin = require('bitcoinjs-lib');
    
    // Create P2WPKH address from public key
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: pubKeyBuffer,
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
 * Returns both addresses and their metadata (index, chain, isUsed)
 * OPTIMIZED: Uses in-memory cache to avoid redundant blockchain queries within TTL window
 */
export async function discoverUsedAddresses(xpub: string): Promise<string[]>;
export async function discoverUsedAddresses(xpub: string, returnMetadata: true): Promise<Array<{ address: string; index: number; chain: number; isUsed: boolean }>>;
export async function discoverUsedAddresses(xpub: string, returnMetadata: boolean = false): Promise<string[] | Array<{ address: string; index: number; chain: number; isUsed: boolean }>> {
  console.log(`🔍 Starting address discovery for xpub: ${xpub.substring(0, 20)}...`);
  
  // Check cache first
  const cached = addressMetadataCache.get(xpub);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < METADATA_CACHE_TTL) {
    console.log(`✅ Using cached address metadata (age: ${Math.round((now - cached.timestamp) / 1000)}s)`);
    
    if (returnMetadata) {
      return cached.metadata;
    }
    
    const usedAddresses = cached.metadata
      .filter(a => a.isUsed)
      .map(a => a.address);
    
    return Array.from(new Set(usedAddresses));
  }
  
    console.log(`🔍 Cache miss or expired, performing address discovery...`);
    console.log(`🔍 Full xpub for discovery:`, xpub);
    
    try {
      await ensureECC();
    
    // Use centralized bip32 loader
    const bip32Module = await loadBip32Module();
    
    if (!bip32Module) {
      throw new Error('BIP32 module not available');
    }
    
    if (!bip32Module.BIP32Factory) {
      console.error('❌ BIP32Factory not found in module:', bip32Module);
      throw new Error('BIP32Factory not available in bip32 module');
    }
    
    const ecc = (global as any).ecc;
    const bip32Instance = bip32Module.BIP32Factory(ecc);
    
    const node = bip32Instance.fromBase58(xpub);
    let allUsedAddresses: string[] = [];
    let allAddressMetadata: Array<{ address: string; index: number; chain: number; isUsed: boolean }> = [];

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
        console.log(`🔍 Batch addresses:`, batch.map(addr => addr.substring(0, 10) + '...'));
        
        // Query the batch with controlled concurrency to avoid rate limiting
        // Process addresses sequentially with small delays to avoid 429 errors
        const addressTxs: any[] = [];
        for (let i = 0; i < batch.length; i++) {
          const addr = batch[i];
          try {
            console.log(`🔍 Checking address ${index + i}: ${addr}`);
            const result = await esploraGet(`/address/${addr}/txs`, 900000);
            console.log(`📊 Address ${index + i}: ${Array.isArray(result) ? result.length : 0} transactions`);
            addressTxs.push(result);
            
            // Add small delay between requests to avoid rate limiting (especially on iOS)
            if (i < batch.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 250));
            }
          } catch (error) {
            console.warn(`⚠️ Failed to check address ${index + i}:`, error);
            addressTxs.push([]);
          }
        }
        
        // Process addresses in order and track gap correctly
        for (let i = 0; i < addressTxs.length; i++) {
          const addressTxsResult = addressTxs[i];
          const isUsed = addressTxsResult && Array.isArray(addressTxsResult) && addressTxsResult.length > 0;
          const addressIndex = index + i;
          
          console.log(`🔍 Address ${addressIndex} (${batch[i].substring(0, 10)}...):`, {
            hasResult: !!addressTxsResult,
            isArray: Array.isArray(addressTxsResult),
            txCount: Array.isArray(addressTxsResult) ? addressTxsResult.length : 'N/A',
            isUsed: isUsed
          });
          
          if (returnMetadata) {
            allAddressMetadata.push({
              address: batch[i],
              index: addressIndex,
              chain,
              isUsed
            });
          }
          
          if (isUsed) {
            allUsedAddresses.push(batch[i]);
            gap = 0; // Reset gap when we find a used address
            console.log(`✅ Found used address at index ${addressIndex}: ${batch[i]} (${addressTxsResult.length} transactions)`);
          } else {
            gap++; // Increment gap for unused address
            console.log(`🔍 Address ${addressIndex} unused, gap: ${gap}`);
          }
        }
        
        // Check if we've reached the gap limit
        if (gap >= GAP_LIMIT) {
          console.log(`🔍 Gap limit reached for ${chain === 0 ? 'external' : 'internal'} chain at index ${index + gap - 1}`);
          break;
        }

        index += GAP_LIMIT;

        // Slow down between batches to avoid hitting provider rate limits during
        // large wallet discovery sweeps.
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Cache the metadata for future use
    addressMetadataCache.set(xpub, {
      metadata: allAddressMetadata,
      timestamp: Date.now()
    });
    console.log(`✅ Cached address metadata for xpub: ${xpub.substring(0, 20)}...`);
    
    if (returnMetadata) {
      const usedCount = allAddressMetadata.filter(a => a.isUsed).length;
      console.log(`✅ Address discovery complete: ${usedCount} used addresses found out of ${allAddressMetadata.length} total`);
      console.log(`📋 All metadata:`, allAddressMetadata.map(a => ({
        address: a.address.substring(0, 10) + '...',
        index: a.index,
        chain: a.chain,
        isUsed: a.isUsed
      })));
      return allAddressMetadata;
    }
    
    const uniqueAddresses = Array.from(new Set(allUsedAddresses));
    console.log(`✅ Address discovery complete: ${uniqueAddresses.length} used addresses found`);
    console.log(`📋 Used addresses:`, uniqueAddresses.map(addr => addr.substring(0, 10) + '...'));
    console.log(`📋 All discovered addresses:`, allAddressMetadata.map(a => ({
      address: a.address.substring(0, 10) + '...',
      index: a.index,
      chain: a.chain,
      isUsed: a.isUsed
    })));
    
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
    
    // Load transaction cache on first call
    await loadTransactionCache();
    
    // Log cache stats
    const cacheStats = getCacheStats();
    console.log(`📦 Transaction cache: ${cacheStats.confirmedCount} confirmed, ${cacheStats.unconfirmedCount} unconfirmed`);
    
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
    const perAddressDelayMs = 1500; // Additional delay between addresses
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
            getAddressTransactions(address, xpub),
            getAddressUTXOs(address, xpub),
            getAddressStats(address, xpub)
          ]);

          if (txsResult.data && Array.isArray(txsResult.data)) {
            // Add all transactions to the map
            // Note: Caching is now handled transparently in esploraGet
            for (const tx of txsResult.data) {
              allTxs.set(tx.txid, tx);
            }
          }

          // Record associations for this wallet for later deletion and reuse
          try {
            const txids = (txsResult.data || []).map((t: any) => t.txid);
            await recordWalletAssociationsXpub(xpub, [address], txids);
          } catch (e) {
            console.warn('Failed to record wallet associations:', e);
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

          // Small delay to avoid rate limiting (increased for heavy loops)
          await new Promise(resolve => setTimeout(resolve, perAddressDelayMs));
          
        } catch (error) {
          console.warn(`⚠️ Failed to process address ${address}:`, error);
        }
      }
    };

    // Run workers with controlled concurrency
    await Promise.all(Array.from({ length: Math.min(concurrency, usedAddresses.length) }, () => worker()));

    console.log(`📊 Collected ${allTxs.size} unique transactions and ${utxos.length} UTXOs`);
    
    // Note: Transaction caching is now handled transparently in esploraGet
    // No need to manually cache transactions here

    // Process transactions
    const transactions: Transaction[] = Array.from(allTxs.values()).map((tx: any): Transaction => {
      const ourAddressesSet = new Set(usedAddresses);
      
      // Calculate amounts for proper display
      let receivedAmountSatoshis = 0;  // Amount received from external addresses
      let sentAmountSatoshis = 0;      // Amount sent to external addresses
      let changeAmountSatoshis = 0;    // Amount returned as change
      
      // Calculate received amount (from external addresses to our addresses)
      tx.vout.forEach((out: any) => {
        if (out.scriptpubkey_address && ourAddressesSet.has(out.scriptpubkey_address)) {
          receivedAmountSatoshis += out.value;
        }
      });
      
      // Calculate sent amount (from our addresses to external addresses)
      tx.vin.forEach((inp: any) => {
        if (inp.prevout?.scriptpubkey_address && ourAddressesSet.has(inp.prevout.scriptpubkey_address)) {
          sentAmountSatoshis += inp.prevout.value;
        }
      });
      
      // Calculate change (amount returned to our addresses)
      tx.vout.forEach((out: any) => {
        if (out.scriptpubkey_address && ourAddressesSet.has(out.scriptpubkey_address)) {
          changeAmountSatoshis += out.value;
        }
      });
      
      // Determine transaction type and display amount
      const isSent = sentAmountSatoshis > 0;
      const isReceived = receivedAmountSatoshis > 0 && sentAmountSatoshis === 0;
      
      // For sent transactions, show the amount sent to external addresses (excluding change)
      // For received transactions, show the amount received
      const displayAmountSatoshis = isSent 
        ? sentAmountSatoshis - changeAmountSatoshis  // Amount sent minus change returned
        : receivedAmountSatoshis;  // Amount received
      
      const displayAmountBtc = displayAmountSatoshis / 1e8;
      const isConfirmed = tx.status?.confirmed || false;
      const confirmations = isConfirmed && latestBlockHeight ? latestBlockHeight - tx.status.block_height + 1 : 0;
      const txDate = isConfirmed ? new Date(tx.status.block_time * 1000) : new Date();
      const isPending = !isConfirmed;

      const fromAddress = tx.vin?.map((i: any) => i.prevout?.scriptpubkey_address).filter(Boolean) ?? [];
      const toAddress = tx.vout?.map((o: any) => o.scriptpubkey_address).filter(Boolean) ?? [];

      // Check for RBF and CPFP
      const hasRBF = tx.vin?.some((input: any) => {
        const sequence = typeof input.sequence === 'string' 
          ? (input.sequence.startsWith('0x') ? parseInt(input.sequence, 16) : parseInt(input.sequence, 10))
          : input.sequence;
        return sequence < 0xFFFFFFFE;
      }) || false;

      // Check for CPFP - only if this transaction spends outputs from an UNCONFIRMED parent transaction
      const isCPFPChild = tx.vin?.some((input: any) => {
        const parentTx = allTxs.get(input.txid);
        // Only consider it CPFP if parent is unconfirmed (pending)
        return parentTx && !parentTx.status?.confirmed;
      }) || false;

      // Check if this transaction has child transactions (CPFP parent)
      // Only consider it a CPFP parent if this transaction is unconfirmed
      const walletOwnsInputs = tx.vin?.some((input: any) =>
        input.prevout?.scriptpubkey_address && ourAddressesSet.has(input.prevout.scriptpubkey_address)
      ) || false;

      const walletOwnsOutputs = tx.vout?.some((output: any) =>
        output.scriptpubkey_address && ourAddressesSet.has(output.scriptpubkey_address)
      ) || false;

      const rbfEligible = isPending && hasRBF && walletOwnsInputs;
      const cpfpEligible = isPending && walletOwnsOutputs;

      const parentTxid = isCPFPChild
        ? (tx.vin?.find((input: any) => {
            const parentTx = allTxs.get(input.txid);
            return parentTx && !parentTx.status?.confirmed;
          })?.txid)
        : undefined;

      const cpfpChildTxids = isPending
        ? Array.from(allTxs.values())
            .filter((childTx: any) =>
              childTx.vin?.some((input: any) => input.txid === tx.txid)
            )
            .map((childTx: any) => childTx.txid)
        : [];

      return {
        txid: tx.txid,
        type: isSent ? 'sent' : 'received',
        amount: Math.abs(displayAmountBtc),
        amountUSD: Math.abs(displayAmountBtc) * btcPrice,
        address: isSent 
          ? (tx.vout?.find((output: any) => !ourAddressesSet.has(output.scriptpubkey_address))?.scriptpubkey_address || 'External Address')
          : (tx.vin?.find((input: any) => !ourAddressesSet.has(input.prevout?.scriptpubkey_address))?.prevout?.scriptpubkey_address || 'External Address'),
        timestamp: txDate.getTime(),
        confirmations,
        status: isConfirmed ? 'confirmed' : 'pending',
        rbf: hasRBF,
        rbfEligible,
        cpfp: isCPFPChild,
        cpfpEligible,
        parentTxid,
        childTxids: cpfpChildTxids.length > 0 ? cpfpChildTxids : undefined,
        fee: tx.fee ? tx.fee / 1e8 : undefined, // Convert satoshis to BTC
        feeRate: tx.fee && tx.vsize ? (tx.fee / tx.vsize) : undefined,
        size: tx.size,
        vsize: tx.vsize,
        inputs: tx.vin?.map((input: any) => ({
          txid: input.txid,
          vout: input.vout,
          value: input.prevout?.value || 0,
          address: input.prevout?.scriptpubkey_address,
          scriptSig: input.scriptsig,
          witness: input.witness,
        })),
        outputs: tx.vout?.map((output: any, index: number) => ({
          value: output.value,
          address: output.scriptpubkey_address,
          scriptPubKey: output.scriptpubkey,
          n: index,
          spent: false, // We don't track spent status in this context
        })),
        blockHeight: tx.status?.block_height,
        blockHash: tx.status?.block_hash,
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
    
    // Use centralized bip32 loader
    const bip32Module = await loadBip32Module();
    
    if (!bip32Module) {
      throw new Error('BIP32 module not available');
    }
    
    if (!bip32Module.BIP32Factory) {
      console.error('❌ BIP32Factory not found in module:', bip32Module);
      throw new Error('BIP32Factory not available in bip32 module');
    }
    
    const ecc = (global as any).ecc;
    const bip32Instance = bip32Module.BIP32Factory(ecc);
    
    const node = bip32Instance.fromBase58(xpub);
    console.log('🔧 Node created from xpub, checking properties...');
    console.log('🔧 Node has publicKey:', !!node.publicKey);
    console.log('🔧 Node has privateKey:', !!node.privateKey);
    
    // Fix: Include change level (chain 0 for external addresses) in BIP84 derivation path
    const child = node.deriveChild(0).deriveChild(index);
    console.log('🔧 Child derived, checking properties...');
    console.log('🔧 Child has publicKey:', !!child.publicKey);
    console.log('🔧 Child publicKey type:', typeof child.publicKey);
    console.log('🔧 Child publicKey length:', child.publicKey ? child.publicKey.length : 'N/A');
    
    if (!child.publicKey) {
      console.error('❌ Child node missing publicKey property');
      console.error('❌ Child node properties:', Object.keys(child));
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
    
    console.log('🔧 Calling ensureECC...');
    await ensureECC();
    console.log('🔧 ensureECC completed');
    
    // Check ECC availability with detailed logging
    console.log('🔧 Checking global object for ecc...');
    console.log('🔧 global object keys:', Object.keys(global).filter(k => k.includes('ecc') || k.includes('crypto')));
    
    const ecc = (global as any).ecc;
    console.log('🔧 ECC from global:', typeof ecc, ecc ? 'exists' : 'null/undefined');
    
    if (!ecc) {
      console.error('❌ ECC library not found on global object');
      console.error('❌ Attempting to reinitialize...');
      
      // Try to reinitialize
      const { initializeCrypto } = require('./crypto-polyfill');
      const success = await initializeCrypto();
      
      if (!success) {
        throw new Error('ECC library initialization failed');
      }
      
      const eccRetry = (global as any).ecc;
      if (!eccRetry) {
        throw new Error('ECC library not available after reinitialization');
      }
      
      console.log('✅ ECC library available after retry:', typeof eccRetry, Object.keys(eccRetry));
    } else {
      console.log('✅ ECC library available:', typeof ecc, Object.keys(ecc));
    }
    
    // Get ECC again to ensure we have the latest reference
    const eccFinal = (global as any).ecc;
    if (!eccFinal) {
      throw new Error('ECC library lost after initialization');
    }
    
    // Generate xpub from mnemonic
    if (!bip39) {
      throw new Error('BIP39 library not available');
    }
    
    // Use centralized bip32 loader
    const bip32Module = await loadBip32Module();
    
    if (!bip32Module) {
      throw new Error('BIP32 module not available');
    }
    
    if (!bip32Module.BIP32Factory) {
      console.error('❌ BIP32Factory not found in module:', bip32Module);
      throw new Error('BIP32Factory not available in bip32 module');
    }
    
    const bip32Instance = bip32Module.BIP32Factory(eccFinal);
    
    console.log('🔧 BIP32 factory created');
    
    const seed = await bip39.mnemonicToSeed(mnemonic);
    console.log('🔧 Seed generated, length:', seed.length);
    
    const root = bip32Instance.fromSeed(seed);
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
 * Find next unused address index using proper BIP44 gap limit logic
 * Discovers used addresses and returns the next truly unused address
 * Implements proper gap limit (20 consecutive unused addresses) before stopping
 * 
 * This function properly follows BIP44 gap limit rules:
 * 1. Find the highest used address index (on blockchain)
 * 2. Check sequentially from that point until we find an address not in the wallet
 * 3. Never wrap around (no modulo) - addresses are sequential
 * 
 * Performance optimized: Uses metadata from discoverUsedAddresses to avoid redundant
 * cryptographic operations. Checks both blockchain usage AND wallet-local existence.
 */
export async function findNextUnusedAddressIndexWithCycling(xpub: string, wallet: Wallet): Promise<number> {
  console.log(`🔍 Finding next unused address for wallet: ${wallet.name}, current index: ${wallet.currentAddressIndex || 0}`);
  
  try {
    // Get current index, default to 0 if not set
    const currentIndex = wallet.currentAddressIndex || 0;
    
    // Discover all addresses with metadata (includes index and usage status)
    // This single call replaces the expensive loop that was regenerating addresses
    console.log(`🔍 Discovering addresses with metadata...`);
    const addressMetadata = await discoverUsedAddresses(xpub, true);
    console.log(`📊 Found ${addressMetadata.length} addresses (${addressMetadata.filter(a => a.isUsed).length} used on blockchain)`);
    
    // Build a set of wallet addresses for O(1) lookup
    const walletAddressSet = new Set(wallet.addresses);
    
    // Filter to only external chain (0) addresses for receiving
    const externalAddresses = addressMetadata.filter(a => a.chain === 0);
    
    // Find the highest used address index on the blockchain
    const usedExternalAddresses = externalAddresses.filter(a => a.isUsed);
    const highestUsedIndex = usedExternalAddresses.length > 0
      ? Math.max(...usedExternalAddresses.map(a => a.index))
      : -1;
    
    console.log(`📊 Highest used address index on blockchain: ${highestUsedIndex}`);
    
    // Start searching from the maximum of:
    // 1. One past the highest blockchain-used index
    // 2. One past the current wallet index (to ensure we move forward)
    const startSearchIndex = Math.max(highestUsedIndex + 1, currentIndex + 1);
    console.log(`🔍 Starting search from index ${startSearchIndex}`);
    
    // Search through discovered addresses first (fast - no crypto operations needed)
    for (const addrMeta of externalAddresses) {
      if (addrMeta.index >= startSearchIndex && 
          !addrMeta.isUsed && 
          !walletAddressSet.has(addrMeta.address)) {
        console.log(`✅ Found unused address at index ${addrMeta.index} (from cached metadata)`);
        return addrMeta.index;
      }
    }
    
    // If not found in discovered addresses, generate sequentially from the start point
    // This handles the case where we need addresses beyond what was discovered
    console.log(`🔍 No suitable address found in cache, generating new addresses...`);
    await ensureECC();
    
    let searchIndex = startSearchIndex;
    const maxSearchIndex = startSearchIndex + 100; // Reasonable upper bound
    
    while (searchIndex < maxSearchIndex) {
      const address = await generateAddressFromXpub(xpub, searchIndex);
      
      // Check if this address is NOT in the wallet (wallet-local check)
      // This is the key difference from blockchain usage check
      if (!walletAddressSet.has(address)) {
        console.log(`✅ Found unused address at index ${searchIndex} (newly generated)`);
        return searchIndex;
      }
      
      console.log(`🔍 Address at index ${searchIndex} already in wallet, checking next...`);
      searchIndex++;
    }
    
    // Fallback: if we still can't find an unused address, return next sequential
    console.log(`⚠️ Could not find unused address after checking ${maxSearchIndex - startSearchIndex} addresses`);
    console.log(`✅ Fallback: returning index ${startSearchIndex}`);
    return startSearchIndex;
    
  } catch (error) {
    console.error(`❌ Failed to find next unused address:`, error);
    // Fallback to simple increment (no wrap-around)
    const currentIndex = wallet.currentAddressIndex || 0;
    const fallbackIndex = currentIndex + 1;
    console.log(`✅ Error fallback: returning index ${fallbackIndex}`);
    return fallbackIndex;
  }
}

/**
 * Pre-generate a pool of addresses for fast access
 * This eliminates the need to generate addresses on-demand
 */
export async function generateAddressPool(xpub: string, poolSize: number = 20): Promise<string[]> {
  try {
    await ensureECC();
    
    const addresses: string[] = [];
    for (let i = 0; i < poolSize; i++) {
      const address = await generateAddressFromXpub(xpub, i);
      addresses.push(address);
    }
    
    console.log(`✅ Generated address pool of ${poolSize} addresses`);
    return addresses;
  } catch (error) {
    console.error('❌ Failed to generate address pool:', error);
    throw error;
  }
}

/**
 * Generate a new address for the wallet using proper gap limit logic
 */
export const generateNewAddress = async (wallet: Wallet): Promise<Wallet> => {
  try {
    console.log('🔧 Generating new address for wallet:', wallet.name);
    
    // Build a set of existing wallet addresses for O(1) lookup
    const existingAddresses = new Set(wallet.addresses);
    
    // Find the next address index using proper BIP44 gap limit logic
    let nextIndex = await findNextUnusedAddressIndexWithCycling(wallet.xpub, wallet);
    let newAddress = await generateAddressFromXpub(wallet.xpub, nextIndex);
    
    // If the address is already in the wallet, sequentially increment the index
    // until we find one that's not in the wallet (avoiding the infinite loop bug)
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop
    
    while (existingAddresses.has(newAddress) && attempts < maxAttempts) {
      attempts++;
      console.warn(`⚠️ Address at index ${nextIndex} already exists in wallet, trying next index (attempt ${attempts})`);
      
      // Simply increment sequentially (no modulo wrap-around)
      // This ensures we don't get stuck in a loop and follows BIP44 sequential addressing
      nextIndex = nextIndex + 1;
      newAddress = await generateAddressFromXpub(wallet.xpub, nextIndex);
    }
    
    // If we exhausted all attempts, throw an error
    if (existingAddresses.has(newAddress)) {
      throw new Error('Unable to generate a unique address after maximum attempts');
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
 * OPTIMIZED: Uses cached metadata from discoverUsedAddresses to avoid redundant blockchain queries
 * This is the same caching strategy used for new address generation
 */
export async function generateAddressesForView(xpub: string, chainType: 'receiving' | 'change' = 'receiving'): Promise<Array<{address: string, index: number, isUsed: boolean, balance: number, txCount: number, type: 'receiving' | 'change'}>> {
  console.log(`🔍 Generating addresses for view: ${chainType} chain (using cached metadata)`);
  
  try {
    // Use the same optimized discovery function that caches metadata
    // This avoids redundant blockchain queries
    console.log(`🔍 Fetching address metadata with caching...`);
    const addressMetadata = await discoverUsedAddresses(xpub, true);
    console.log(`✅ Retrieved ${addressMetadata.length} addresses from cache (${addressMetadata.filter(a => a.isUsed).length} used)`);
    
    const chain = chainType === 'receiving' ? 0 : 1; // External (0) or Internal (1) chain
    
    // Filter to the requested chain
    const chainAddresses = addressMetadata.filter(a => a.chain === chain);
    console.log(`📊 Filtered to ${chainAddresses.length} ${chainType} addresses`);
    
    // Now fetch balance and transaction count for each address
    // This is still necessary, but we're reusing the address discovery cache
    const result: Array<{address: string, index: number, isUsed: boolean, balance: number, txCount: number, type: 'receiving' | 'change'}> = [];
    
    for (const addrMeta of chainAddresses) {
      try {
        // Only fetch stats if the address is used (optimization)
        let balance = 0;
        let txCount = 0;
        
        if (addrMeta.isUsed) {
          const [txsResult, statsResult] = await Promise.all([
            esploraGet(`/address/${addrMeta.address}/txs`, 30000),
            getAddressStats(addrMeta.address)
          ]);
          
          txCount = txsResult && Array.isArray(txsResult) ? txsResult.length : 0;
          balance = statsResult.data?.chain_stats ? 
            (statsResult.data.chain_stats.funded_txo_sum - statsResult.data.chain_stats.spent_txo_sum) / 1e8 : 0;
        }
        
        result.push({
          address: addrMeta.address,
          index: addrMeta.index,
          isUsed: addrMeta.isUsed,
          balance,
          txCount,
          type: chainType
        });
        
        if (addrMeta.isUsed) {
          console.log(`✅ ${chainType} address ${addrMeta.index}: ${txCount} txs, ${balance.toFixed(8)} BTC`);
        }
        
        // Small delay to avoid rate limiting (only for used addresses)
        if (addrMeta.isUsed) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get stats for ${chainType} address ${addrMeta.index}:`, error);
        // Still add the address with metadata we already have
        result.push({
          address: addrMeta.address,
          index: addrMeta.index,
          isUsed: addrMeta.isUsed,
          balance: 0,
          txCount: 0,
          type: chainType
        });
      }
    }
    
    console.log(`✅ Generated ${result.length} ${chainType} addresses for view (${result.filter(a => a.isUsed).length} used, ${result.filter(a => !a.isUsed).length} unused)`);
    return result;
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
    
    // Use centralized bip32 loader
    const bip32Module = await loadBip32Module();
    
    if (!bip32Module) {
      throw new Error('BIP32 module not available');
    }
    
    const ecc = (global as any).ecc;
    const bip32Instance = bip32Module.BIP32Factory(ecc);
    
    const node = bip32Instance.fromBase58(xpub);
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
    
    if (!bip39) {
      throw new Error('BIP39 library not available');
    }
    
    // Use centralized bip32 loader
    const bip32Module = await loadBip32Module();
    
    if (!bip32Module) {
      throw new Error('BIP32 module not available');
    }
    
    if (!bip32Module.BIP32Factory) {
      console.error('❌ BIP32Factory not found in module:', bip32Module);
      throw new Error('BIP32Factory not available in bip32 module');
    }
    
    const ecc = (global as any).ecc;
    const bip32Instance = bip32Module.BIP32Factory(ecc);
    
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32Instance.fromSeed(seed);
    
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
