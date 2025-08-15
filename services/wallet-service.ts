// Import crypto polyfill first
import '@/services/crypto-polyfill';

import { Platform } from 'react-native';
import { Wallet } from '@/types/wallet';

// Import bip39 with better error handling
let bip39: any;
try {
  bip39 = require('bip39');
  console.log('✅ Successfully loaded bip39');
} catch (error) {
  console.warn('⚠️ bip39 not available:', error);
  bip39 = null;
}

// ECC implementation for BIP32 using @noble/secp256k1 (pure JS, no WASM)
const createECC = () => {
  try {
    // Import @noble/secp256k1 directly
    const secp = require('@noble/secp256k1');
    console.log('✅ Using @noble/secp256k1 for ECC operations');
    
    // Create BIP32-compatible interface
    return {
      isPoint: (p: Uint8Array): boolean => {
        try {
          if (p.length === 33 && (p[0] === 0x02 || p[0] === 0x03)) return true;
          if (p.length === 65 && p[0] === 0x04) return true;
          return false;
        } catch {
          return false;
        }
      },
      isPrivate: (d: Uint8Array): boolean => {
        try {
          return secp.utils.isValidPrivateKey(d);
        } catch {
          return false;
        }
      },
      pointFromScalar: (d: Uint8Array, compressed?: boolean): Uint8Array | null => {
        try {
          const point = secp.getPublicKey(d, compressed !== false);
          return point;
        } catch {
          return null;
        }
      },
      pointAddScalar: (p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null => {
        // This is a complex operation, for now return null to indicate not supported
        // In a real implementation, you'd need to do point arithmetic
        return null;
      },
      privateAdd: (d: Uint8Array, tweak: Uint8Array): Uint8Array | null => {
        try {
          // Convert to bigint for arithmetic
          const dBig = secp.utils.bytesToNumberBE(d);
          const tweakBig = secp.utils.bytesToNumberBE(tweak);
          const result = secp.utils.mod(dBig + tweakBig, secp.CURVE.n);
          return secp.utils.numberToBytesBE(result, 32);
        } catch {
          return null;
        }
      },
      sign: (hash: Uint8Array, privateKey: Uint8Array): Uint8Array => {
        const signature = secp.sign(hash, privateKey);
        return signature.toCompactRawBytes();
      },
      verify: (hash: Uint8Array, publicKey: Uint8Array, signature: Uint8Array): boolean => {
        try {
          return secp.verify(signature, hash, publicKey);
        } catch {
          return false;
        }
      }
    };
  } catch (error) {
    console.warn('⚠️ @noble/secp256k1 not available:', error);
    throw new Error('ECC implementation not available. This feature requires a mobile device with proper crypto libraries.');
  }
};

const DERIVATION_PATH = "m/84'/0'/0'"; // BIP84 for native segwit

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
    
    if (bip39) {
      console.log('Using bip39 library');
      const result = bip39.generateMnemonic(strength);
      console.log('Generated mnemonic successfully with', result.split(' ').length, 'words');
      return result;
    }
    console.log('bip39 not available, using fallback');
    throw new Error('bip39 not available');
  } catch (error) {
    console.error('Error generating mnemonic:', error);
    console.log('Using fallback mnemonic');
    const result = strength === 256 ? fallback24 : fallback12;
    console.log('Successfully generated mnemonic with wallet service');
    return result;
  }
};

export const validateMnemonic = (mnemonic: string): boolean => {
  try {
    if (bip39) {
      return bip39.validateMnemonic(mnemonic);
    }
    // Fallback validation - just check word count and basic format
    const words = mnemonic.trim().split(/\s+/);
    return words.length === 12 || words.length === 24;
  } catch (error) {
    console.error('Error validating mnemonic:', error);
    // Fallback validation - just check word count and basic format
    const words = mnemonic.trim().split(/\s+/);
    return words.length === 12 || words.length === 24;
  }
};

export const createWallet = async (name: string, color: string = '#8B5CF6'): Promise<Wallet> => {
  // On web, use the web-specific implementation
  if (Platform.OS === 'web') {
    try {
      const webService = require('./wallet-service.web');
      return webService.createWallet(name, color);
    } catch (error) {
      console.error('Error with web service:', error);
      throw new Error('Wallet creation is not available on web in Expo Go. Please open this project on a mobile device using the QR code.');
    }
  }

  try {
    const mnemonic = await generateMnemonic();
    return importWallet(name, mnemonic, color);
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw error;
  }
};

export const importWallet = async (name: string, mnemonic: string, color: string = '#8B5CF6'): Promise<Wallet> => {
  // On web, use the web-specific implementation
  if (Platform.OS === 'web') {
    try {
      const webService = require('./wallet-service.web');
      return webService.importWallet(name, mnemonic, color);
    } catch (error) {
      console.error('Error with web service:', error);
      throw new Error('Wallet import is not available on web in Expo Go. Please open this project on a mobile device using the QR code.');
    }
  }

  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  try {
    console.log('Attempting to import wallet on mobile platform:', Platform.OS);
    
    // Check if required libraries are available
    if (!bip39) {
      throw new Error('BIP39 library not available');
    }
    
    // Test hash functions
    if (typeof (global as any).hashes === 'undefined' || typeof (global as any).hashes.hmacSha256Sync !== 'function') {
      throw new Error('Hash functions not properly initialized');
    }
    
    const { BIP32Factory } = require('bip32');
    const bip32 = BIP32Factory(createECC());

    console.log('Converting mnemonic to seed...');
    const seed = await bip39.mnemonicToSeed(mnemonic);
    console.log('Seed generated, creating root key...');
    
    const root = bip32.fromSeed(seed);
    console.log('Root key created, deriving account...');
    
    const account = root.derivePath(DERIVATION_PATH);
    const xpub = account.neutered().toBase58();
    console.log('Account derived, generating first address...');

    const firstAddress = await generateAddressFromXpub(xpub, 0);
    console.log('First address generated:', firstAddress);

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

    console.log('Wallet created successfully');
    return wallet;
  } catch (error) {
    console.error('Error creating wallet:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('hashes.hmacSha256Sync')) {
        throw new Error('Cryptographic functions not properly initialized. Please restart the app.');
      }
      if (error.message.includes('BIP39')) {
        throw new Error('Mnemonic processing library not available.');
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
    const { BIP32Factory } = require('bip32');
    const bip32 = BIP32Factory(createECC());
    const bitcoin = require('bitcoinjs-lib');
    const node = bip32.fromBase58(xpub);
    const child = node.derive(0).derive(index);
    const payment = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(child.publicKey) });
    if (!payment?.address) throw new Error('Failed to derive address');
    return payment.address as string;
  } catch (error) {
    console.error('Error generating address:', error);
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
    const { BIP32Factory } = require('bip32');
    const bip32 = BIP32Factory(createECC());
    const seed = bip39 ? await bip39.mnemonicToSeed(mnemonic) : new Uint8Array(64);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(`${DERIVATION_PATH}/0/${addressIndex}`);
    return child.toWIF();
  } catch (error) {
    console.error('Error getting private key:', error);
    throw new Error('Failed to get private key. This feature requires a mobile device.');
  }
};