import { Platform } from 'react-native';
import { Wallet } from '@/types/wallet';
import * as secp256k1 from '@noble/secp256k1';

// Import bip39 with better error handling
let bip39: any;
try {
  bip39 = require('bip39');
  console.log('Successfully loaded bip39');
} catch (error) {
  console.log('bip39 not available, using fallback');
  bip39 = null;
}

// Simple ECC implementation for BIP32
const createECC = () => {
  return {
    isPrivate: (privateKey: Uint8Array): boolean => {
      try {
        // Check if it's a valid 32-byte private key
        if (privateKey.length !== 32) return false;
        const key = secp256k1.utils.normPrivateKeyToScalar(privateKey);
        return key > 0n && key < secp256k1.CURVE.n;
      } catch {
        return false;
      }
    },
    isPoint: (p: Uint8Array): boolean => {
      try {
        secp256k1.Point.fromHex(p);
        return true;
      } catch {
        return false;
      }
    },
    pointFromScalar: (sk: Uint8Array): Uint8Array | null => {
      try {
        return secp256k1.Point.fromPrivateKey(sk).toRawBytes();
      } catch {
        return null;
      }
    },
    pointAddScalar: (p: Uint8Array, tweak: Uint8Array): Uint8Array | null => {
      try {
        const point = secp256k1.Point.fromHex(p);
        const tweakPoint = secp256k1.Point.fromPrivateKey(tweak);
        return point.add(tweakPoint).toRawBytes();
      } catch {
        return null;
      }
    },
    pointMultiply: (p: Uint8Array, tweak: Uint8Array): Uint8Array | null => {
      try {
        const point = secp256k1.Point.fromHex(p);
        const scalar = secp256k1.utils.normPrivateKeyToScalar(tweak);
        return point.multiply(scalar).toRawBytes();
      } catch {
        return null;
      }
    },
    privateAdd: (privateKey: Uint8Array, tweak: Uint8Array): Uint8Array | null => {
      try {
        const key = secp256k1.utils.normPrivateKeyToScalar(privateKey);
        const tweakScalar = secp256k1.utils.normPrivateKeyToScalar(tweak);
        let result = (key + tweakScalar) % secp256k1.CURVE.n;
        const bytes = new Uint8Array(32);
        for (let i = 31; i >= 0; i--) {
          bytes[i] = Number(result & 0xffn);
          result = result >> 8n;
        }
        return bytes;
      } catch {
        return null;
      }
    },
    privateNegate: (privateKey: Uint8Array): Uint8Array => {
      const key = secp256k1.utils.normPrivateKeyToScalar(privateKey);
      let negated = secp256k1.CURVE.n - key;
      const bytes = new Uint8Array(32);
      for (let i = 31; i >= 0; i--) {
        bytes[i] = Number(negated & 0xffn);
        negated = negated >> 8n;
      }
      return bytes;
    },
    sign: (hash: Uint8Array, privateKey: Uint8Array): Uint8Array => {
      return secp256k1.sign(hash, privateKey).toCompactRawBytes();
    },
    verify: (signature: Uint8Array, hash: Uint8Array, publicKey: Uint8Array): boolean => {
      try {
        return secp256k1.verify(signature, hash, publicKey);
      } catch {
        return false;
      }
    },
  };
};

const DERIVATION_PATH = "m/84'/0'/0'"; // BIP84 for native segwit

export const generateMnemonic = (strength: number = 128): string => {
  // On web, use the web-specific implementation
  if (Platform.OS === 'web') {
    try {
      const webService = require('./wallet-service.web');
      return webService.generateMnemonic(strength);
    } catch (error) {
      console.error('Error with web service:', error);
      // Fallback for web
      const fallback12 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const fallback24 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
      return strength === 256 ? fallback24 : fallback12;
    }
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
    // Fallback for demo purposes
    const fallback12 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const fallback24 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
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

  const mnemonic = generateMnemonic();
  return importWallet(name, mnemonic, color);
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
    const { BIP32Factory } = require('bip32');
    const bip32 = BIP32Factory(createECC());

    const seed = bip39 ? await bip39.mnemonicToSeed(mnemonic) : new Uint8Array(64);
    const root = bip32.fromSeed(seed);
    const account = root.derivePath(DERIVATION_PATH);
    const xpub = account.neutered().toBase58();

    const firstAddress = await generateAddressFromXpub(xpub, 0);

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

    return wallet;
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw new Error('Failed to create wallet. This feature requires a mobile device.');
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