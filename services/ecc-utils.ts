/**
 * Shared ECC Utilities
 * Consolidates ECC validation, initialization, and address derivation utilities
 * used across bitcoin-service, rbf-service, and cpfp-service.
 */

import { loadBip32Module } from './bip32-loader';

// ============================================================================
// Types
// ============================================================================

/**
 * Interface for the ECC library functions used by bitcoinjs-lib and related services.
 * The library is typically @noble/secp256k1 exposed via crypto-polyfill.
 */
export interface ECCLibrary {
  isPrivate(privKey: Uint8Array): boolean;
  pointFromScalar(scalar: Uint8Array, compressed: boolean): Uint8Array | null;
  sign(hash: Uint8Array, privKey: Uint8Array): Uint8Array;
  verify(hash: Uint8Array, pubKey: Uint8Array, signature: Uint8Array): boolean;
}

// ============================================================================
// Transaction Size Constants
// ============================================================================

/**
 * Standard SegWit v0 P2WPKH input size: 68 bytes
 * Derived from: 32 (txid) + 4 (vout) + 1 (scriptSig length) + 4 (sequence) +
 * 1 (witness item count) + 72 (signature) + 33 (pubkey), weighted by witness discount
 */
export const P2WPKH_INPUT_SIZE = 68;

/**
 * Standard SegWit v0 P2WPKH output size: 34 bytes
 * Derived from: 8 (value) + 1 (scriptPubKey length) + 25 (scriptPubKey for P2WPKH)
 */
export const P2WPKH_OUTPUT_SIZE = 34;

/**
 * Base transaction overhead: 10 bytes
 * version (4) + input count (1) + output count (1) + locktime (4)
 */
export const TX_BASE_SIZE = 10;

// ============================================================================
// ECC Validation Functions
// ============================================================================

/**
 * Validates basic ECC library functionality (private key validation and point generation).
 * Throws an error if validation fails.
 */
export function validateECCLibrary(ecc: ECCLibrary): void {
  const testPrivateKey = new Uint8Array(32);
  testPrivateKey[31] = 1; // Set to 1 to ensure it's a valid private key

  // Test private key validation
  if (!ecc.isPrivate(testPrivateKey)) {
    throw new Error('ECC private key validation failed');
  }

  // Test point generation
  const publicKey = ecc.pointFromScalar(testPrivateKey, true);
  if (!publicKey || publicKey.length !== 33) {
    throw new Error('ECC point generation failed');
  }
}

/**
 * Validates full ECC library functionality including signing and verification.
 * This is a more comprehensive test than validateECCLibrary.
 * Throws an error if validation fails.
 */
export function validateECCLibraryFull(ecc: ECCLibrary): void {
  // First run basic validation
  validateECCLibrary(ecc);

  const testPrivateKey = new Uint8Array(32);
  testPrivateKey[31] = 1;

  // Get public key for verification
  const publicKey = ecc.pointFromScalar(testPrivateKey, true);
  if (!publicKey) {
    throw new Error('ECC point generation failed');
  }

  // Test signing
  const testHash = new Uint8Array(32);
  testHash.fill(0xaa);

  const signature = ecc.sign(testHash, testPrivateKey);
  if (!signature || signature.length === 0) {
    throw new Error('ECC signing failed');
  }

  // Test verification
  const isValid = ecc.verify(testHash, publicKey, signature);
  if (!isValid) {
    throw new Error('ECC signature verification failed');
  }
}

/**
 * Initializes bitcoinjs-lib with the provided ECC library.
 * Validates the ECC library and performs verification tests.
 *
 * @param ecc - The ECC library to use (typically from global.ecc)
 * @returns The bitcoin module after initialization
 */
export async function initializeBitcoinJsWithECC(ecc: ECCLibrary): Promise<any> {
  if (!ecc) {
    throw new Error('ECC library not available');
  }

  // Validate ECC library before using it
  console.log('🔧 Validating ECC library before bitcoinjs-lib initialization...');

  try {
    validateECCLibrary(ecc);
    console.log('✅ ECC library validation passed');
  } catch (eccError) {
    console.error('❌ ECC library validation failed:', eccError);
    throw new Error(`ECC library invalid: ${eccError instanceof Error ? eccError.message : 'Unknown error'}`);
  }

  // Initialize bitcoinjs-lib with ECC
  const bitcoin = require('bitcoinjs-lib');

  try {
    console.log('🔧 Initializing bitcoinjs-lib with ECC...');
    console.log('🔧 ECC object keys:', Object.keys(ecc));

    // Check if bitcoinjs-lib has the initEccLib method
    if (typeof bitcoin.initEccLib !== 'function') {
      throw new Error('bitcoinjs-lib.initEccLib is not a function');
    }

    console.log('🔧 Calling bitcoin.initEccLib...');
    const initResult = bitcoin.initEccLib(ecc);
    if (initResult instanceof Promise) {
      await initResult;
    }

    // Verify the initialization worked
    console.log('🔧 Verifying ECC initialization...');
    console.log('🔧 Available bitcoin object keys:', Object.keys(bitcoin));

    // In bitcoinjs-lib 7.0.0+, ECPair was removed. The library works with PSBT instead.
    // We verify that our ECC library works correctly with signing/verification tests.
    console.log('🔧 Testing ECC library functionality (bitcoinjs-lib 7.x compatible)...');

    try {
      validateECCLibraryFull(ecc);
      console.log('✅ ECC library verification successful');
    } catch (verifyError) {
      console.error('❌ ECC verification failed:', verifyError);
      throw new Error(`ECC library not working properly: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`);
    }

    console.log('✅ bitcoinjs-lib initialized with ECC successfully');
    return bitcoin;
  } catch (initError) {
    console.error('❌ Failed to initialize bitcoinjs-lib with ECC:', initError);
    console.error('❌ Error type:', typeof initError);
    console.error('❌ Error message:', initError instanceof Error ? initError.message : 'Unknown error');
    throw new Error(`Failed to initialize bitcoinjs-lib: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Transaction Size Estimation
// ============================================================================

/**
 * Estimate transaction size in virtual bytes.
 * Assumes all inputs/outputs are SegWit v0 P2WPKH type.
 *
 * @param inputCount - Number of transaction inputs
 * @param outputCount - Number of transaction outputs
 * @returns Estimated transaction size in vBytes
 */
export function estimateTransactionSize(inputCount: number, outputCount: number): number {
  let size = TX_BASE_SIZE;
  size += inputCount * P2WPKH_INPUT_SIZE;
  size += outputCount * P2WPKH_OUTPUT_SIZE;
  return size;
}

// ============================================================================
// Address Index Cache
// ============================================================================

/**
 * Cache for address-to-index mappings to avoid redundant derivations.
 * Format: Map<cacheKey, "chain:index">
 */
const addressIndexCache = new Map<string, string>();

/**
 * Clear the address index cache.
 * Call this when switching wallets or when cache becomes stale.
 */
export function clearAddressIndexCache(): void {
  addressIndexCache.clear();
  console.log('🧹 Cleared address index cache');
}

/**
 * Get the current size of the address index cache.
 */
export function getAddressIndexCacheSize(): number {
  return addressIndexCache.size;
}

// ============================================================================
// Address Derivation Utilities
// ============================================================================

/**
 * Derive the BIP32 address index and chain from an address by testing derivation paths.
 * Returns { index, chain } where chain is 0 for external/receiving, 1 for internal/change.
 *
 * Performance improvements:
 * 1. Uses caching to avoid redundant derivations
 * 2. Implements optimized linear search with batching
 * 3. Adds small delays between batches to prevent UI blocking
 *
 * @param mnemonic - The wallet mnemonic
 * @param targetAddress - The Bitcoin address to find the derivation path for
 * @returns Object containing the address index and chain (0=external, 1=change)
 */
export async function deriveAddressIndexAndChainFromAddress(
  mnemonic: string,
  targetAddress: string
): Promise<{ index: number; chain: number }> {
  try {
    // Check cache first
    const cacheKey = `${targetAddress}_full`;
    if (addressIndexCache.has(cacheKey)) {
      const cached = addressIndexCache.get(cacheKey)!;
      console.log(`✅ Found cached BIP32 index ${cached} for address: ${targetAddress}`);
      const [chain, index] = cached.split(':').map(Number);
      return { index, chain };
    }

    console.log(`🔍 Deriving BIP32 index and chain for address: ${targetAddress}`);

    // Load required modules
    const bip32Module = await loadBip32Module();
    if (!bip32Module || !bip32Module.BIP32Factory) {
      throw new Error('BIP32 module or BIP32Factory not available');
    }

    const bip39 = require('bip39');
    const ecc = (global as any).ecc;
    const bip32Instance = bip32Module.BIP32Factory(ecc);
    const bech32 = await import('bech32');
    const { sha256 } = await import('@noble/hashes/sha256');
    const { ripemd160 } = await import('@noble/hashes/ripemd160');

    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32Instance.fromSeed(seed);

    // Search parameters
    const batchSize = 50;
    const batchDelay = 5;
    const maxSearchRange = 10000;

    // Check both external (chain 0) and internal/change (chain 1) chains
    for (const chain of [0, 1]) {
      const chainNode = root.derivePath(`m/84'/0'/0'/${chain}`);

      let foundIndex = -1;
      let currentIndex = 0;

      while (foundIndex === -1 && currentIndex < maxSearchRange) {
        const endIndex = Math.min(currentIndex + batchSize, maxSearchRange);

        for (let i = currentIndex; i < endIndex; i++) {
          try {
            const child = chainNode.derive(i);
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
            console.warn(`⚠️ Failed to derive address at chain ${chain}, index ${i}:`, error);
            continue;
          }
        }

        currentIndex = endIndex;

        // Small delay between batches to prevent UI blocking
        if (foundIndex === -1 && currentIndex < maxSearchRange) {
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
      }

      if (foundIndex !== -1) {
        // Cache the result
        addressIndexCache.set(cacheKey, `${chain}:${foundIndex}`);
        console.log(`✅ Found BIP32 chain ${chain}, index ${foundIndex} for address: ${targetAddress}`);
        return { index: foundIndex, chain };
      }
    }

    throw new Error(`Could not find BIP32 index for address: ${targetAddress} (searched both chains up to index ${maxSearchRange})`);
  } catch (error) {
    console.error('❌ Failed to derive address index and chain:', error);
    throw error;
  }
}

/**
 * Derive the BIP32 address index from an address (external chain only).
 * Legacy function - prefer deriveAddressIndexAndChainFromAddress for new code.
 *
 * @param mnemonic - The wallet mnemonic
 * @param targetAddress - The Bitcoin address to find the derivation path for
 * @returns The address index on the external chain (chain 0)
 */
export async function deriveAddressIndexFromAddress(
  mnemonic: string,
  targetAddress: string
): Promise<number> {
  try {
    // Check cache first (simple key without chain)
    if (addressIndexCache.has(targetAddress)) {
      const cachedValue = addressIndexCache.get(targetAddress)!;
      console.log(`✅ Found cached BIP32 index ${cachedValue} for address: ${targetAddress}`);
      // Parse the index from cached value
      const cachedIndex = cachedValue.includes(':')
        ? parseInt(cachedValue.split(':')[1], 10)
        : parseInt(cachedValue, 10);
      return cachedIndex;
    }

    console.log(`🔍 Deriving BIP32 index for address: ${targetAddress}`);

    // Load required modules
    const bip32Module = await loadBip32Module();
    if (!bip32Module || !bip32Module.BIP32Factory) {
      throw new Error('BIP32 module or BIP32Factory not available');
    }

    const bip39 = require('bip39');
    const ecc = (global as any).ecc;
    const bip32Instance = bip32Module.BIP32Factory(ecc);
    const bech32 = await import('bech32');
    const { sha256 } = await import('@noble/hashes/sha256');
    const { ripemd160 } = await import('@noble/hashes/ripemd160');

    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32Instance.fromSeed(seed);
    const externalChain = root.derivePath(`m/84'/0'/0'/0`);

    // Search parameters
    const batchSize = 50;
    const batchDelay = 5;
    let currentIndex = 0;
    const maxSearchRange = 10000;

    let foundIndex = -1;

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

    // If not found in the initial range, expand the search
    if (foundIndex === -1) {
      console.log('🔍 Address not found in initial range, expanding search...');

      const expandedBatchSize = 25;
      const expandedBatchDelay = 10;
      let expandedHigh = maxSearchRange * 2;

      while (foundIndex === -1 && expandedHigh <= 100000) {
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
    addressIndexCache.set(targetAddress, String(foundIndex));
    console.log(`✅ Found BIP32 index ${foundIndex} for address: ${targetAddress}`);
    return foundIndex;
  } catch (error) {
    console.error('❌ Failed to derive address index:', error);
    throw error;
  }
}

/**
 * Find the next unused address index for generating new addresses.
 * This ensures we don't reuse addresses and follow proper BIP32 gap limit.
 *
 * @param mnemonic - The wallet mnemonic
 * @param walletAddresses - Array of known wallet addresses
 * @returns The next unused address index
 */
export async function findNextUnusedAddressIndex(
  mnemonic: string,
  walletAddresses: string[]
): Promise<number> {
  try {
    console.log(`🔍 Finding next unused address index for ${walletAddresses.length} addresses...`);

    const usedIndices = new Set<number>();
    let successfulDerivations = 0;
    const batchSize = 5;
    const batchDelay = 10;

    for (let i = 0; i < walletAddresses.length; i += batchSize) {
      const batch = walletAddresses.slice(i, i + batchSize);

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
      console.warn('⚠️ Could not derive any address indices, using fallback index 0');
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
    console.error('❌ Failed to find next unused address index:', error);
    console.warn('⚠️ Using fallback index 0');
    return 0;
  }
}

// ============================================================================
// Change Address Generation
// ============================================================================

/**
 * Generate a change address using the wallet's derivation path.
 * Change addresses use chain 1 (internal/change chain) per BIP84.
 *
 * @param mnemonic - The wallet mnemonic
 * @param changeIndex - The index on the change chain (default: 0)
 * @returns The generated change address (P2WPKH/bc1q format)
 */
export async function generateChangeAddress(
  mnemonic: string,
  changeIndex: number = 0
): Promise<string> {
  try {
    console.log('🔧 Generating change address for index:', changeIndex);

    // Load required modules
    const bip32Module = await loadBip32Module();
    if (!bip32Module || !bip32Module.BIP32Factory) {
      throw new Error('BIP32 module or BIP32Factory not available');
    }

    const bip39 = require('bip39');
    const ecc = (global as any).ecc;
    const bip32Instance = bip32Module.BIP32Factory(ecc);

    // Derive key for change address (chain 1)
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

    console.log('✅ Generated change address:', address);
    return address;
  } catch (error) {
    console.error('❌ Failed to generate change address:', error);
    throw error;
  }
}

/**
 * Generate a cancellation address for RBF transaction cancellation.
 * Uses the next unused address index to avoid address reuse.
 *
 * @param mnemonic - The wallet mnemonic
 * @param walletAddresses - Array of known wallet addresses
 * @returns The generated address for receiving cancelled funds
 */
export async function generateCancellationAddress(
  mnemonic: string,
  walletAddresses: string[]
): Promise<string> {
  try {
    console.log('🔧 Generating cancellation address...');

    // Find the next unused address index instead of using array length
    const addressIndex = await findNextUnusedAddressIndex(mnemonic, walletAddresses);

    // Load required modules
    const bip32Module = await loadBip32Module();
    if (!bip32Module || !bip32Module.BIP32Factory) {
      throw new Error('BIP32 module or BIP32Factory not available');
    }

    const bip39 = require('bip39');
    const ecc = (global as any).ecc;
    const bip32Instance = bip32Module.BIP32Factory(ecc);

    // Derive key for cancellation address (external chain)
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32Instance.fromSeed(seed);
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
    console.error('❌ Failed to generate cancellation address:', error);
    throw error;
  }
}
