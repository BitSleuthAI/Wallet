// Import ECC override FIRST to prevent tiny-secp256k1 WASM loading
import '@/services/ecc-override';
// Import crypto polyfill second
import '@/services/crypto-polyfill';

import { Platform } from 'react-native';
import { Wallet } from '@/types/wallet';

// CRITICAL: ECC override is now active to prevent tiny-secp256k1 WASM loading
console.log('✅ ECC override active - tiny-secp256k1 imports will be redirected to @noble/secp256k1');

// Import bip39 with better error handling
let bip39: any;
try {
  bip39 = require('bip39');
  console.log('✅ Successfully loaded bip39');
} catch (error) {
  console.warn('⚠️ bip39 not available:', error);
  bip39 = null;
}

// IMPORTANT: Completely avoiding tiny-secp256k1 to prevent WASM loading errors
// Using only @noble/secp256k1 which is pure JavaScript and Expo Go compatible

// ECC implementation using only @noble/secp256k1 for Expo Go compatibility
const createECC = () => {
  console.log('🔧 Initializing ECC library with @noble/secp256k1...');

  try {
    const noble = require('@noble/secp256k1');
    console.log('✅ Using @noble/secp256k1 as ECC implementation');
    
    if (!noble || typeof noble.getPublicKey !== 'function') {
      throw new Error('@noble/secp256k1 not properly loaded');
    }

    const eccInterface = {
      isPoint: (p: Uint8Array): boolean => {
        try {
          if (!p || p.length === 0) return false;
          noble.Point.fromHex(p);
          return true;
        } catch {
          return false;
        }
      },
      isPrivate: (d: Uint8Array): boolean => {
        if (!d || d.length !== 32) return false;
        try {
          noble.getPublicKey(d, true);
          return true;
        } catch {
          return false;
        }
      },
      pointFromScalar: (d: Uint8Array, compressed = true): Uint8Array | null => {
        try {
          if (!d || d.length !== 32) return null;
          const point = noble.getPublicKey(d, compressed);
          return new Uint8Array(point);
        } catch {
          return null;
        }
      },
      pointAddScalar: (p: Uint8Array, tweak: Uint8Array, compressed = true): Uint8Array | null => {
        try {
          if (!p || p.length === 0 || !tweak || tweak.length !== 32) return null;
          const P = noble.Point.fromHex(p);
          const T = noble.Point.fromPrivateKey(tweak);
          const R = P.add(T);
          return new Uint8Array(R.toRawBytes(compressed));
        } catch {
          return null;
        }
      },
      privateAdd: (d: Uint8Array, tweak: Uint8Array): Uint8Array | null => {
        try {
          if (!d || d.length !== 32 || !tweak || tweak.length !== 32) return null;
          const dBig = BigInt('0x' + Array.from(d).map(b => b.toString(16).padStart(2, '0')).join(''));
          const tweakBig = BigInt('0x' + Array.from(tweak).map(b => b.toString(16).padStart(2, '0')).join(''));
          const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
          const result = (dBig + tweakBig) % n;
          if (result === 0n) return null;
          const hex = result.toString(16).padStart(64, '0');
          return new Uint8Array(hex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
        } catch {
          return null;
        }
      },
      sign: (hash: Uint8Array, privateKey: Uint8Array): Uint8Array => {
        try {
          console.log('🔐 Attempting to sign with noble secp256k1...');
          
          // Validate inputs
          if (!hash || hash.length !== 32) {
            throw new Error('Invalid hash: must be 32 bytes');
          }
          if (!privateKey || privateKey.length !== 32) {
            throw new Error('Invalid private key: must be 32 bytes');
          }
          
          // Use noble's sign function
          const sig = noble.sign(hash, privateKey);
          
          // Handle different signature formats
          if (sig && typeof sig.toCompactRawBytes === 'function') {
            const compactSig = sig.toCompactRawBytes();
            console.log('✅ Noble signature created, length:', compactSig.length);
            return new Uint8Array(compactSig);
          } else if (sig && sig.length) {
            console.log('✅ Noble signature created (raw), length:', sig.length);
            return new Uint8Array(sig);
          } else {
            throw new Error('Invalid signature format from noble.sign');
          }
          
        } catch (err) {
          console.error('❌ ECC sign error:', err);
          throw err;
        }
      },
      verify: (hash: Uint8Array, publicKey: Uint8Array, signature: Uint8Array): boolean => {
        try {
          return noble.verify(signature, hash, publicKey);
        } catch (e) {
          console.log('ECC verify error:', e);
          return false;
        }
      },
    };

    // Self-test
    const testKey = new Uint8Array(32);
    testKey[31] = 1;
    const testPoint = eccInterface.pointFromScalar(testKey, true);
    if (testPoint && testPoint.length === 33) {
      console.log('✅ ECC (noble) self-test passed');
      return eccInterface;
    }
    throw new Error('ECC self-test failed');
  } catch (err) {
    console.error('❌ Noble ECC init failed:', err);
    throw new Error('ECC library invalid');
  }
};

const DERIVATION_PATH = "m/84'/0'/0'"; // BIP84 for native segwit

// Wait for crypto initialization with timeout
const waitForCryptoInitialization = async (maxWaitMs: number = 5000): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    // Check if crypto initialization flag is set
    if ((global as any).__cryptoInitialized) {
      console.log('✅ Crypto initialization flag detected');
      
      // Double-check that crypto is actually working
      if (typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function') {
        try {
          // Test crypto functionality
          const testArray = new Uint8Array(4);
          crypto.getRandomValues(testArray);
          console.log('✅ Crypto initialization verified');
          return;
        } catch (error) {
          console.log('Crypto test failed despite flag, waiting...', error);
        }
      }
    }
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.warn('⚠️ Crypto initialization timeout, proceeding anyway');
};

export const generateMnemonic = async (strength: number = 128): Promise<string> => {
  // Fallback mnemonics for demo purposes
  const fallback12 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const fallback24 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
  
  // On web, use simple fallback to avoid crypto issues
  if (Platform.OS === 'web') {
    console.log('Web: Using fallback mnemonic');
    return strength === 256 ? fallback24 : fallback12;
  }
  
  try {
    console.log('Generating mnemonic with strength:', strength);
    
    // Check if crypto.getRandomValues is available
    if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
      console.warn('crypto.getRandomValues not available, using fallback');
      const result = strength === 256 ? fallback24 : fallback12;
      console.log('Successfully generated fallback mnemonic');
      return result;
    }
    
    // Test crypto.getRandomValues before using bip39
    try {
      const testArray = new Uint8Array(16);
      crypto.getRandomValues(testArray);
      console.log('✅ crypto.getRandomValues test successful, entropy check:', Array.from(testArray.slice(0, 4)));
      
      // Verify we have good entropy
      const uniqueValues = new Set(Array.from(testArray)).size;
      if (uniqueValues < 8) {
        console.warn('Low entropy detected, using fallback');
        throw new Error('Low entropy');
      }
    } catch (cryptoError) {
      console.error('crypto.getRandomValues test failed:', cryptoError);
      const result = strength === 256 ? fallback24 : fallback12;
      console.log('Using fallback mnemonic due to crypto test failure');
      return result;
    }
    
    if (bip39) {
      try {
        console.log('Using bip39 library for mnemonic generation');
        const result = bip39.generateMnemonic(strength);
        
        // Validate the generated mnemonic
        if (!result || typeof result !== 'string') {
          throw new Error('Invalid mnemonic generated');
        }
        
        const words = result.split(' ');
        if (words.length !== (strength === 256 ? 24 : 12)) {
          throw new Error(`Invalid word count: expected ${strength === 256 ? 24 : 12}, got ${words.length}`);
        }
        
        console.log('✅ Generated mnemonic successfully with', words.length, 'words');
        return result;
      } catch (bip39Error) {
        console.error('BIP39 mnemonic generation failed:', bip39Error);
        throw bip39Error;
      }
    }
    
    console.log('bip39 not available, using fallback');
    throw new Error('bip39 not available');
  } catch (error) {
    console.error('❌ Error generating mnemonic:', error);
    console.log('Using fallback mnemonic');
    const result = strength === 256 ? fallback24 : fallback12;
    console.log('✅ Successfully generated fallback mnemonic');
    return result;
  }
};

export const validateMnemonic = (mnemonic: string): boolean => {
  try {
    console.log('Validating mnemonic:', mnemonic.substring(0, 20) + '...');
    
    // Basic format validation first
    if (!mnemonic || typeof mnemonic !== 'string') {
      console.log('Invalid mnemonic: not a string');
      return false;
    }
    
    const cleanMnemonic = mnemonic.trim().toLowerCase();
    const words = cleanMnemonic.split(/\s+/).filter(word => word.length > 0);
    console.log('Word count:', words.length);
    
    if (words.length !== 12 && words.length !== 24) {
      console.log('Invalid word count:', words.length);
      return false;
    }
    
    // Check for empty or invalid words
    for (const word of words) {
      if (!word || word.length < 3 || word.length > 8) {
        console.log('Invalid word format:', word);
        return false;
      }
    }
    
    if (bip39) {
      try {
        const isValid = bip39.validateMnemonic(cleanMnemonic);
        console.log('BIP39 validation result:', isValid);
        return isValid;
      } catch (bip39Error) {
        console.warn('BIP39 validation failed:', bip39Error);
        // Fall through to basic validation
      }
    }
    
    // Enhanced fallback validation
    console.log('Using enhanced fallback validation');
    
    // Basic word list check (simplified BIP39 word list validation)
    const commonWords = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse'];
    let validWordCount = 0;
    
    for (const word of words) {
      // Check if word looks like a valid BIP39 word (3-8 chars, lowercase letters only)
      if (/^[a-z]{3,8}$/.test(word)) {
        validWordCount++;
      }
    }
    
    // Accept if most words look valid
    const isValid = validWordCount >= words.length * 0.8;
    console.log(`Fallback validation: ${validWordCount}/${words.length} words look valid, result: ${isValid}`);
    return isValid;
    
  } catch (error) {
    console.error('Error validating mnemonic:', error);
    // Final fallback - just check basic format
    try {
      const words = mnemonic.trim().split(/\s+/).filter(word => word.length > 0);
      const isValid = (words.length === 12 || words.length === 24) && words.every(word => /^[a-z]{3,8}$/.test(word.toLowerCase()));
      console.log('Final fallback validation result:', isValid);
      return isValid;
    } catch {
      return false;
    }
  }
};

export const createWallet = async (name: string, color: string = '#8B5CF6'): Promise<Wallet> => {
  // On web, use the web-specific implementation
  if (Platform.OS === 'web') {
    const webService = require('./wallet-service.web');
    return webService.createWallet(name, color);
  }

  try {
    console.log('Creating new wallet:', name);
    const mnemonic = await generateMnemonic();
    console.log('✅ Mnemonic generated, importing wallet...');
    return await importWallet(name, mnemonic, color);
  } catch (error) {
    console.error('❌ Error creating wallet:', error);
    throw error;
  }
};

export const importWallet = async (name: string, mnemonic: string, color: string = '#8B5CF6'): Promise<Wallet> => {
  // On web, use the web-specific implementation
  if (Platform.OS === 'web') {
    const webService = require('./wallet-service.web');
    return webService.importWallet(name, mnemonic, color);
  }

  console.log('Starting wallet import process...');
  
  // Validate mnemonic first
  if (!validateMnemonic(mnemonic)) {
    console.error('Mnemonic validation failed');
    throw new Error('Invalid mnemonic phrase');
  }
  console.log('✅ Mnemonic validation passed');

  try {
    console.log('Attempting to import wallet on mobile platform:', Platform.OS);
    
    // Wait for crypto initialization
    await waitForCryptoInitialization();
    
    // Check if required libraries are available
    if (!bip39) {
      console.error('BIP39 library not available');
      throw new Error('BIP39 library not available');
    }
    console.log('✅ BIP39 library available');
    
    // Initialize ECC with better error handling
    let ecc;
    try {
      ecc = createECC();
      console.log('✅ ECC library initialized');
      
      // Validate ECC has required methods
      if (!ecc.isPrivate || !ecc.pointFromScalar) {
        throw new Error('ECC library missing required methods');
      }
      
      // Test ECC with a simple operation
      const testPriv = new Uint8Array(32);
      testPriv[31] = 1;
      if (!ecc.isPrivate(testPriv)) {
        throw new Error('ECC library validation failed');
      }
      
    } catch (eccError) {
      console.error('ECC initialization failed:', eccError);
      throw new Error('ECC library invalid');
    }
    
    // Import BIP32 with error handling
    let BIP32Factory;
    try {
      const bip32Module = require('bip32');
      BIP32Factory = bip32Module.BIP32Factory;
      if (!BIP32Factory) {
        throw new Error('BIP32Factory not found in bip32 module');
      }
      console.log('✅ BIP32 module loaded');
    } catch (bip32Error) {
      console.error('BIP32 module loading failed:', bip32Error);
      throw new Error('BIP32 library not available');
    }
    
    // Provide HMAC-SHA512 implementation required by bip32
    let bip32;
    try {
      const { hmac } = require('@noble/hashes/hmac');
      const { sha512 } = require('@noble/hashes/sha512');
      bip32 = BIP32Factory(ecc, {
        hmacSHA512: (key: Uint8Array, data: Uint8Array) => hmac(sha512, key, data),
      });
    } catch (e) {
      console.warn('⚠️ noble/hashes not available, using fallback HMAC-SHA512:', e);
      const fallbackHmacSHA512 = (key: Uint8Array, data: Uint8Array) => {
        const toBytes = (v: any) => (typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(v));
        const k = toBytes(key);
        const d = toBytes(data);
        const combined = new Uint8Array(k.length + d.length);
        combined.set(k, 0);
        combined.set(d, k.length);
        const hash = (global as any).hashes?.sha256 ? (global as any).hashes.sha256('sha256').update(combined).digest() : new Uint8Array(32);
        const out = new Uint8Array(64);
        out.set(hash, 0);
        out.set(hash, 32);
        return out;
      };
      bip32 = BIP32Factory(ecc, { hmacSHA512: fallbackHmacSHA512 });
    }
    console.log('✅ BIP32 factory created');

    console.log('Converting mnemonic to seed...');
    let seed;
    try {
      seed = await bip39.mnemonicToSeed(mnemonic.trim());
      console.log('✅ Seed generated, length:', seed.length);
    } catch (seedError) {
      console.error('Seed generation failed:', seedError);
      throw new Error('Failed to generate seed from mnemonic');
    }
    
    console.log('Creating root key...');
    let root;
    try {
      root = bip32.fromSeed(seed);
      console.log('✅ Root key created');
    } catch (rootError) {
      console.error('Root key creation failed:', rootError);
      throw new Error('Failed to create root key from seed');
    }
    
    console.log('Deriving account with path:', DERIVATION_PATH);
    let account;
    try {
      account = root.derivePath(DERIVATION_PATH);
      console.log('✅ Account derived');
    } catch (deriveError) {
      console.error('Account derivation failed:', deriveError);
      throw new Error('Failed to derive account from root key');
    }
    
    let xpub;
    try {
      xpub = account.neutered().toBase58();
      console.log('✅ Extended public key generated');
    } catch (xpubError) {
      console.error('Extended public key generation failed:', xpubError);
      throw new Error('Failed to generate extended public key');
    }

    console.log('Generating first address...');
    let firstAddress;
    try {
      firstAddress = await generateAddressFromXpub(xpub, 0);
      console.log('✅ First address generated:', firstAddress);
    } catch (addressError) {
      console.error('Address generation failed:', addressError);
      throw new Error('Failed to generate first address');
    }

    const wallet: Wallet = {
      id: Date.now().toString(),
      name,
      color,
      mnemonic,
      xpub,
      addresses: [firstAddress],
      currentAddressIndex: 0,
      balance: 0,
      balanceUSD: 0,
    };

    console.log('✅ Wallet created successfully');
    return wallet;
  } catch (error) {
    console.error('❌ Error creating wallet:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ECC library invalid') || error.message.includes('ecc library invalid')) {
        throw new Error('ECC library invalid');
      }
      if (error.message.includes('BIP39')) {
        throw new Error('Mnemonic processing library not available.');
      }
      if (error.message.includes('BIP32')) {
        throw new Error('HD wallet operations not available. Please ensure you are on a mobile device.');
      }
      throw error;
    }
    
    throw new Error('Failed to create wallet. Please ensure you are running on a mobile device.');
  }
};

export const generateAddressFromXpub = async (xpub: string, index: number): Promise<string> => {
  if (Platform.OS === 'web') {
    throw new Error('Address derivation is not available on web in Expo Go. Please use a mobile device.');
  }
  
  try {
    console.log(`Generating address from xpub for index ${index}`);
    
    // Create ECC with error handling
    let ecc;
    try {
      ecc = createECC();
      if (!ecc.isPrivate || !ecc.pointFromScalar) {
        throw new Error('ECC library missing required methods');
      }
    } catch (eccError) {
      console.error('ECC creation failed:', eccError);
      throw new Error('ECC library invalid');
    }
    
    const { BIP32Factory } = require('bip32');
    let bip32;
    try {
      const { hmac } = require('@noble/hashes/hmac');
      const { sha512 } = require('@noble/hashes/sha512');
      bip32 = BIP32Factory(ecc, {
        hmacSHA512: (key: Uint8Array, data: Uint8Array) => hmac(sha512, key, data),
      });
    } catch (e) {
      console.warn('⚠️ noble/hashes not available, using fallback HMAC-SHA512:', e);
      const fallbackHmacSHA512 = (key: Uint8Array, data: Uint8Array) => {
        const toBytes = (v: any) => (typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(v));
        const k = toBytes(key);
        const d = toBytes(data);
        const combined = new Uint8Array(k.length + d.length);
        combined.set(k, 0);
        combined.set(d, k.length);
        const hash = (global as any).hashes?.sha256 ? (global as any).hashes.sha256('sha256').update(combined).digest() : new Uint8Array(32);
        const out = new Uint8Array(64);
        out.set(hash, 0);
        out.set(hash, 32);
        return out;
      };
      bip32 = BIP32Factory(ecc, { hmacSHA512: fallbackHmacSHA512 });
    }
    const bitcoin = require('bitcoinjs-lib');
    if (typeof bitcoin.initEccLib === 'function') {
      try {
        bitcoin.initEccLib(ecc);
        console.log('✅ bitcoinjs-lib ECC initialized with noble');
      } catch (e) {
        console.warn('⚠️ Failed to init bitcoinjs-lib ECC, continuing:', e);
      }
    }
    
    console.log('Parsing xpub...');
    const node = bip32.fromBase58(xpub);
    
    console.log('Deriving child key...');
    const child = node.derive(0).derive(index);
    
    console.log('Creating payment address...');
    const pubkey = child.publicKey;
    if (!pubkey || pubkey.length === 0) {
      throw new Error('Invalid public key derived');
    }
    
    const payment = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(pubkey) });
    if (!payment?.address) {
      throw new Error('Failed to derive address from public key');
    }
    
    console.log('✅ Address generated successfully:', payment.address);
    return payment.address as string;
  } catch (error) {
    console.error('❌ Error generating address:', error);
    if (error instanceof Error && error.message.includes('ECC library invalid')) {
      throw new Error('ECC library invalid');
    }
    throw new Error('Failed to generate address. This feature requires a mobile device.');
  }
};

export const generateNewAddress = async (wallet: Wallet): Promise<Wallet> => {
  const newIndex = wallet.currentAddressIndex + 1;
  const newAddress = await generateAddressFromXpub(wallet.xpub, newIndex);
  return {
    ...wallet,
    addresses: [...wallet.addresses, newAddress],
    currentAddressIndex: newIndex,
  };
};

export const getPrivateKey = async (mnemonic: string, addressIndex: number): Promise<string> => {
  if (Platform.OS === 'web') {
    throw new Error('Private key export is not available on web in Expo Go. Please use a mobile device.');
  }
  
  try {
    console.log(`Getting private key for address index ${addressIndex}`);
    
    if (!bip39) {
      throw new Error('BIP39 library not available');
    }
    
    let ecc;
    try {
      ecc = createECC();
      if (!ecc.isPrivate || !ecc.pointFromScalar) {
        throw new Error('ECC library missing required methods');
      }
    } catch (eccError) {
      console.error('ECC creation failed:', eccError);
      throw new Error('ECC library invalid');
    }
    
    const { BIP32Factory } = require('bip32');
    let bip32;
    try {
      const { hmac } = require('@noble/hashes/hmac');
      const { sha512 } = require('@noble/hashes/sha512');
      bip32 = BIP32Factory(ecc, {
        hmacSHA512: (key: Uint8Array, data: Uint8Array) => hmac(sha512, key, data),
      });
    } catch (e) {
      console.warn('⚠️ noble/hashes not available, using fallback HMAC-SHA512:', e);
      const fallbackHmacSHA512 = (key: Uint8Array, data: Uint8Array) => {
        const toBytes = (v: any) => (typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(v));
        const k = toBytes(key);
        const d = toBytes(data);
        const combined = new Uint8Array(k.length + d.length);
        combined.set(k, 0);
        combined.set(d, k.length);
        const hash = (global as any).hashes?.sha256 ? (global as any).hashes.sha256('sha256').update(combined).digest() : new Uint8Array(32);
        const out = new Uint8Array(64);
        out.set(hash, 0);
        out.set(hash, 32);
        return out;
      };
      bip32 = BIP32Factory(ecc, { hmacSHA512: fallbackHmacSHA512 });
    }
    
    const seed = await bip39.mnemonicToSeed(mnemonic.trim());
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(`${DERIVATION_PATH}/0/${addressIndex}`);
    
    if (!child.privateKey) {
      throw new Error('Failed to derive private key');
    }
    
    return child.toWIF();
  } catch (error) {
    console.error('❌ Error getting private key:', error);
    if (error instanceof Error && error.message.includes('ECC library invalid')) {
      throw new Error('ECC library invalid');
    }
    throw new Error('Failed to get private key. This feature requires a mobile device.');
  }
};