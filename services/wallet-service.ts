/**
 * Improved Wallet Service with Address Discovery
 * Uses BIP32 derivation and gap limit for proper address discovery
 */

import { ADDRESS_METADATA_CACHE_TTL_MS, ADDRESS_VERIFICATION_TIMEOUT_MS, ENABLE_ADDRESS_VERIFICATION_SAFEGUARD, WALLET_TRANSACTIONS_DISPLAY_LIMIT } from '../constants/cache';
import type { Transaction, Wallet } from '../types/wallet';
import { recordWalletAssociationsXpub } from './address-cache-service';
import { loadBip32Module } from './bip32-loader';
import { ensureECC } from './bitcoin-service';
import { esploraGet, getAddressStats, getAddressTransactionsPaginated, getAddressUTXOs, getBTCPrice, getCurrentBlockHeight } from './esplora-service';
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

// Use centralized cache configuration
const METADATA_CACHE_TTL = ADDRESS_METADATA_CACHE_TTL_MS;

/**
 * Clear the address metadata cache for a specific xpub or all xpubs
 * Useful when user manually refreshes or wants fresh data
 */
export function clearAddressCache(xpub?: string): void {
  if (xpub) {
    addressMetadataCache.delete(xpub);
    console.log(`🗑️ Cleared address cache for xpub`);
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
  console.log(`🔍 Starting address discovery for wallet`);
  
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

    // Helper function to discover addresses for a single chain
    async function discoverChain(chain: number): Promise<{
      usedAddresses: string[];
      metadata: Array<{ address: string; index: number; chain: number; isUsed: boolean }>;
    }> {
      const chainName = chain === 0 ? 'external' : 'internal';
      console.log(`🔍 Checking ${chainName} chain...`);

      const chainUsedAddresses: string[] = [];
      const chainMetadata: Array<{ address: string; index: number; chain: number; isUsed: boolean }> = [];
      let gap = 0;
      let index = 0;

      while (gap < GAP_LIMIT) {
        const batch = await deriveAddressBatch(node, chain, index, index + GAP_LIMIT);
        console.log(`🔍 [${chainName}] Checking batch ${index}-${index + GAP_LIMIT - 1} (${batch.length} addresses)`);

        // OPTIMIZED: Fetch transaction counts for batch in parallel
        // Rate limiting is handled at the request queue level
        const addressTxsPromises = batch.map(async (addr, i) => {
          const addressIndex = index + i;
          try {
            const result = await esploraGet(`/address/${addr}/txs`, 900000, xpub);
            const txCount = Array.isArray(result) ? result.length : 0;
            if (txCount > 0) {
              console.log(`✅ [${chainName}] Address ${addressIndex}: ${txCount} transactions`);
            }
            return result;
          } catch (error) {
            console.warn(`⚠️ [${chainName}] Failed to check address ${addressIndex}:`, error);
            return [];
          }
        });

        const addressTxs = await Promise.all(addressTxsPromises);

        // Process addresses in order and track gap correctly
        for (let i = 0; i < addressTxs.length; i++) {
          const addressTxsResult = addressTxs[i];
          const isUsed = addressTxsResult && Array.isArray(addressTxsResult) && addressTxsResult.length > 0;
          const addressIndex = index + i;

          chainMetadata.push({
            address: batch[i],
            index: addressIndex,
            chain,
            isUsed
          });

          if (isUsed) {
            chainUsedAddresses.push(batch[i]);
            gap = 0; // Reset gap when we find a used address
            console.log(`✅ [${chainName}] Found used address at index ${addressIndex}: ${batch[i].substring(0, 10)}... (${addressTxsResult.length} txs)`);
          } else {
            gap++; // Increment gap for unused address
          }
        }

        // Check if we've reached the gap limit
        if (gap >= GAP_LIMIT) {
          console.log(`🔍 [${chainName}] Gap limit reached at index ${index + gap - 1}`);
          break;
        }

        index += GAP_LIMIT;
      }

      return { usedAddresses: chainUsedAddresses, metadata: chainMetadata };
    }

    // OPTIMIZATION: Discover both chains in parallel
    // External chain (0) for receiving addresses, internal chain (1) for change addresses
    console.log(`🔍 Starting parallel chain discovery...`);
    const [externalResult, internalResult] = await Promise.all([
      discoverChain(0),
      discoverChain(1)
    ]);

    // Merge results from both chains
    allUsedAddresses = [...externalResult.usedAddresses, ...internalResult.usedAddresses];
    if (returnMetadata) {
      allAddressMetadata = [...externalResult.metadata, ...internalResult.metadata];
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
      return allAddressMetadata;
    }
    
    const uniqueAddresses = Array.from(new Set(allUsedAddresses));
    console.log(`✅ Address discovery complete: ${uniqueAddresses.length} used addresses found`);
    
    return uniqueAddresses;
  } catch (error) {
    console.error(`❌ Address discovery failed:`, error);
    throw error;
  }
}

type WalletDataResult = { data: any | null; error: string | null };

// Memoization for getWalletData: the balance, transactions, and UTXO queries in
// wallet-store all call it independently on the same 30s poll cycle. Sharing
// in-flight promises plus a TTL just under the poll interval collapses those
// 3 pipeline runs into 1 without changing any query key or invalidation path.
const WALLET_DATA_MEMO_TTL_MS = 25 * 1000;
const walletDataInFlight = new Map<string, Promise<WalletDataResult>>();
const walletDataMemo = new Map<string, { result: WalletDataResult; timestamp: number }>();

// The "no transaction history" result comes from a completed, successful scan
// of an empty wallet — memoizing it avoids rescanning 3x per poll. Real
// failures (network, rate limit) are never memoized so retries stay immediate.
function isMemoizableResult(result: WalletDataResult): boolean {
  return !result.error || result.error.includes('no transaction history');
}

/** Drops memoized wallet data so the next getWalletData call hits the network (used by pull-to-refresh). */
export function clearWalletDataMemo(): void {
  walletDataInFlight.clear();
  walletDataMemo.clear();
}

export async function getWalletData(xpub: string): Promise<WalletDataResult> {
  const cached = walletDataMemo.get(xpub);
  if (cached && Date.now() - cached.timestamp < WALLET_DATA_MEMO_TTL_MS) {
    return cached.result;
  }

  const inFlight = walletDataInFlight.get(xpub);
  if (inFlight) {
    return inFlight;
  }

  const promise = fetchWalletDataUncached(xpub)
    .then(result => {
      if (isMemoizableResult(result)) {
        walletDataMemo.set(xpub, { result, timestamp: Date.now() });
      }
      return result;
    })
    .finally(() => {
      walletDataInFlight.delete(xpub);
    });

  walletDataInFlight.set(xpub, promise);
  return promise;
}

/**
 * Get comprehensive wallet data using address discovery
 */
async function fetchWalletDataUncached(xpub: string): Promise<WalletDataResult> {
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

    // Fetch data for all used addresses sequentially with aggressive rate limiting
    // Based on Blockstream Green, Trust Wallet, and Bluewallet best practices
    // Sequential processing avoids race conditions and 429 errors
    const allTxs = new Map<string, any>();
    const utxos: any[] = [];
    let activeAddressCount = 0;

    // Process addresses with parallelized API calls per address.
    // Rate limiting is handled at the request queue level in esplora-service.
    // Note: no per-address /address/{addr} stats call — the wallet balance is
    // computed from UTXOs below, and address activity is derivable from the
    // txs response (which discovery just fetched, so this read is a cache hit).
    for (let idx = 0; idx < usedAddresses.length; idx++) {
      const address = usedAddresses[idx];
      try {
        console.log(`📊 Processing address ${idx + 1}/${usedAddresses.length}: ${address.substring(0, 10)}...`);

        const [utxosResult, txsResult] = await Promise.all([
          getAddressUTXOs(address, xpub),
          getAddressTransactionsPaginated(address, xpub)
        ]);

          if (txsResult.data && Array.isArray(txsResult.data)) {
            // Add all transactions to the map
            // Note: Caching is now handled transparently in esploraGet
            for (const tx of txsResult.data) {
              allTxs.set(tx.txid, tx);
            }
            if (txsResult.data.length > 0) {
              activeAddressCount++;
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
              // Include all UTXO fields needed for transactions
              utxos.push({
                txid: utxo.txid,
                vout: utxo.vout,
                address,
                value: utxo.value,
                status: utxo.status || { confirmed: false },
                scriptPubKey: utxo.scriptpubkey
              });
            });
          }

        // No additional delay needed - rate limiting handled by request queue

      } catch (error) {
        console.warn(`⚠️ Failed to process address ${address}:`, error);
      }
    }

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
      
      // Determine transaction type
      const isSent = sentAmountSatoshis > 0;
      
      // Calculate change (amount returned to our addresses)
      // For sent transactions, exclude the primary recipient from change calculation
      let primaryRecipientAddress: string | null = null;
      if (isSent) {
        // Find the first output to an external address (not ours)
        const externalOutputs = tx.vout.filter((out: any) => out.scriptpubkey_address && !ourAddressesSet.has(out.scriptpubkey_address));
        if (externalOutputs.length > 0) {
          // Optionally, pick the largest output as the primary recipient
          primaryRecipientAddress = externalOutputs.reduce((maxOut: any, out: any) => out.value > maxOut.value ? out : maxOut, externalOutputs[0]).scriptpubkey_address;
        }
      }
      tx.vout.forEach((out: any) => {
        if (
          out.scriptpubkey_address &&
          ourAddressesSet.has(out.scriptpubkey_address) &&
          (!isSent || out.scriptpubkey_address !== primaryRecipientAddress)
        ) {
          changeAmountSatoshis += out.value;
        }
      });
      
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
      transactions: transactions.slice(0, WALLET_TRANSACTIONS_DISPLAY_LIMIT), // Most recent first; history list is virtualized
      usedAddresses,
      addressCount: activeAddressCount,
      utxoCount: utxos.length,
      utxos, // Include full UTXO array for automatic polling updates
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
    
    // Generate unique wallet ID
    const walletId = Date.now().toString();
    
    // SECURITY FIX: Store mnemonic securely using Expo SecureStore
    const { storeMnemonic } = await import('./secure-mnemonic-service');
    await storeMnemonic(walletId, mnemonic);
    console.log('🔐 Mnemonic stored securely in SecureStore');
    
    // Create wallet object WITHOUT mnemonic (mnemonic is now in SecureStore)
    const wallet: Wallet = {
      id: walletId,
      name,
      color,
      addressType: 'p2wpkh',
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
    
    console.log('✅ Wallet imported successfully (mnemonic stored securely)');
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
 * Verify that a specific address has not been used on the blockchain
 * This is a production safeguard to prevent address reuse
 * Returns true if address is safe to use (unused), false if it has been used
 */
export async function verifyAddressUnused(address: string, xpub: string): Promise<boolean> {
  try {
    console.log('🔍 Verifying address is unused:', address.substring(0, 20) + '...');
    
    // Check if address has any transactions
    const txsResult = await esploraGet(`/address/${address}/txs`, ADDRESS_VERIFICATION_TIMEOUT_MS, xpub);
    const hasTransactions = txsResult && Array.isArray(txsResult) && txsResult.length > 0;
    
    if (hasTransactions) {
      console.warn('⚠️ Address has been used - has transactions:', txsResult.length);
      return false;
    }
    
    // Also check address stats for additional confirmation
    const statsResult = await getAddressStats(address, xpub);
    const hasTxCount = statsResult.data?.chain_stats?.tx_count > 0;
    
    if (hasTxCount) {
      console.warn('⚠️ Address has been used - tx count:', statsResult.data.chain_stats.tx_count);
      return false;
    }
    
    console.log('✅ Address verified as unused');
    return true;
  } catch (error) {
    console.error('❌ Failed to verify address:', error);
    // On error, assume address might be used (safer default)
    return false;
  }
}

/**
 * Get the first unused address within gap limit for receiving funds
 * This ensures that used addresses are not displayed as QR codes
 * Returns the address string or null if none found
 */
export async function getFirstUnusedReceivingAddress(xpub: string): Promise<string | null> {
  try {
    console.log('🔍 Finding first unused receiving address within gap limit...');
    
    // Discover all addresses with metadata
    const addressMetadata = await discoverUsedAddresses(xpub, true);
    
    // Filter to only external chain (0) addresses for receiving
    const externalAddresses = addressMetadata.filter(a => a.chain === 0);
    
    // Sort by index to ensure we get the first one
    externalAddresses.sort((a, b) => a.index - b.index);
    
    // Find the first unused address
    const firstUnused = externalAddresses.find(a => !a.isUsed);
    
    if (firstUnused) {
      console.log(`✅ Found first unused address at index ${firstUnused.index}: ${firstUnused.address.substring(0, 20)}...`);
      
      // Production safeguard: Double-check the address is truly unused (if enabled)
      // This catches any cache-related race conditions but adds an extra API call
      // Can be disabled in development via ENABLE_ADDRESS_VERIFICATION_SAFEGUARD constant
      if (!ENABLE_ADDRESS_VERIFICATION_SAFEGUARD) {
        return firstUnused.address;
      }
      
      const isReallyUnused = await verifyAddressUnused(firstUnused.address, xpub);
      
      if (!isReallyUnused) {
        console.error('🚨 CRITICAL: Address marked as unused but verification failed!');
        console.error('🚨 Clearing cache and retrying...');
        
        // Clear cache and retry once
        clearAddressCache(xpub);
        const retryMetadata = await discoverUsedAddresses(xpub, true);
        const retryExternal = retryMetadata.filter(a => a.chain === 0);
        retryExternal.sort((a, b) => a.index - b.index);
        const retryUnused = retryExternal.find(a => !a.isUsed);
        
        if (retryUnused) {
          console.log(`✅ Retry found unused address at index ${retryUnused.index}`);
          return retryUnused.address;
        }
        
        console.error('🚨 CRITICAL: No unused address found after retry!');
        return null;
      }
      
      return firstUnused.address;
    }
    
    console.log('⚠️ No unused address found in discovered addresses');
    return null;
  } catch (error) {
    console.error('❌ Failed to find first unused receiving address:', error);
    return null;
  }
}

/**
 * Generate addresses for view addresses screen following gap limit logic
 * Returns addresses with their usage status following BIP44 gap limit rules
 * OPTIMIZED: Uses cached metadata from discoverUsedAddresses to avoid redundant blockchain queries
 * This is the same caching strategy used for new address generation
 */
export async function generateAddressesForView(xpub: string, chainType: 'receiving' | 'change' = 'receiving'): Promise<Array<{address: string, index: number, isUsed: boolean, balance: number, txCount: number, receivedCount: number, sentCount: number, type: 'receiving' | 'change'}>> {
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
    const result: Array<{address: string, index: number, isUsed: boolean, balance: number, txCount: number, receivedCount: number, sentCount: number, type: 'receiving' | 'change'}> = [];
    
    for (const addrMeta of chainAddresses) {
      try {
        // Only fetch stats if the address is used (optimization)
        let balance = 0;
        let txCount = 0;
        let receivedCount = 0;
        let sentCount = 0;
        
        if (addrMeta.isUsed) {
          const [txsResult, statsResult] = await Promise.all([
            esploraGet(`/address/${addrMeta.address}/txs`, 30000),
            getAddressStats(addrMeta.address)
          ]);
          
          // Calculate transaction counts
          if (txsResult && Array.isArray(txsResult)) {
            txCount = txsResult.length;
            
            // Calculate received and sent counts for this specific address
            // Optimized: Use for loop instead of nested .some() for better performance
            // Note: tx data comes from Esplora API - types are checked at runtime
            for (const tx of txsResult) {
              let hasReceived = false;
              let hasSent = false;
              
              // Check if this address received funds (appears in outputs)
              if (tx.vout && Array.isArray(tx.vout)) {
                for (const output of tx.vout) {
                  if (output.scriptpubkey_address === addrMeta.address) {
                    hasReceived = true;
                    break; // Early exit once found
                  }
                }
              }
              
              // Check if this address sent funds (appears in inputs)
              if (tx.vin && Array.isArray(tx.vin)) {
                for (const input of tx.vin) {
                  if (input.prevout?.scriptpubkey_address === addrMeta.address) {
                    hasSent = true;
                    break; // Early exit once found
                  }
                }
              }
              
              // Count the transaction appropriately
              // Note: A transaction can be counted in both received and sent if the address
              // appears in both inputs and outputs (e.g., change addresses, consolidation)
              // This is correct behavior as it represents both sending from and receiving to the same address
              if (hasReceived) receivedCount++;
              if (hasSent) sentCount++;
            }
          }
          
          balance = statsResult.data?.chain_stats ? 
            (statsResult.data.chain_stats.funded_txo_sum - statsResult.data.chain_stats.spent_txo_sum) / 1e8 : 0;
        }
        
        result.push({
          address: addrMeta.address,
          index: addrMeta.index,
          isUsed: addrMeta.isUsed,
          balance,
          txCount,
          receivedCount,
          sentCount,
          type: chainType
        });
        
        if (addrMeta.isUsed) {
          console.log(`✅ ${chainType} address ${addrMeta.index}: ${txCount} txs (${receivedCount} received, ${sentCount} sent), ${balance.toFixed(8)} BTC`);
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
          receivedCount: 0,
          sentCount: 0,
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
 * Note: This function returns receivedCount and sentCount as 0 for backward compatibility
 * Use generateAddressesForView instead for accurate transaction counts
 */
export async function generateAddressBatchForView(xpub: string, startIndex: number, batchSize: number = 20): Promise<Array<{address: string, index: number, isUsed: boolean, balance: number, txCount: number, receivedCount: number, sentCount: number}>> {
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
    
    const addressData: Array<{address: string, index: number, isUsed: boolean, balance: number, txCount: number, receivedCount: number, sentCount: number}> = [];
    
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
          txCount,
          receivedCount: 0, // Deprecated function doesn't calculate this for performance
          sentCount: 0, // Deprecated function doesn't calculate this for performance
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
          txCount: 0,
          receivedCount: 0,
          sentCount: 0,
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
