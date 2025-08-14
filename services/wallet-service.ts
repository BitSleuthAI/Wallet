import { Platform } from 'react-native';
import * as bip39 from 'bip39';
import { Wallet } from '@/types/wallet';

const DERIVATION_PATH = "m/84'/0'/0'"; // BIP84 for native segwit

export const generateMnemonic = (): string => {
  return bip39.generateMnemonic();
};

export const validateMnemonic = (mnemonic: string): boolean => {
  return bip39.validateMnemonic(mnemonic);
};

export const createWallet = async (name: string): Promise<Wallet> => {
  const mnemonic = generateMnemonic();
  return importWallet(name, mnemonic);
};

export const importWallet = async (name: string, mnemonic: string): Promise<Wallet> => {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  if (Platform.OS === 'web') {
    throw new Error('Wallet import is not available on web in Expo Go. Please use a mobile device.');
  }

  const { BIP32Factory } = require('bip32');
  const ecc = require('tiny-secp256k1');
  const bip32 = BIP32Factory(ecc);

  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed);
  const account = root.derivePath(DERIVATION_PATH);
  const xpub = account.neutered().toBase58();

  const firstAddress = await generateAddressFromXpub(xpub, 0);

  const wallet: Wallet = {
    id: Date.now().toString(),
    name,
    mnemonic,
    xpub,
    addresses: [firstAddress],
    currentAddressIndex: 0,
    balance: 0,
    balanceUSD: 0,
  };

  return wallet;
};

export const generateAddressFromXpub = async (xpub: string, index: number): Promise<string> => {
  if (Platform.OS === 'web') {
    throw new Error('Address derivation is not available on web in Expo Go. Please use a mobile device.');
  }
  const { BIP32Factory } = require('bip32');
  const ecc = require('tiny-secp256k1');
  const bip32 = BIP32Factory(ecc);
  const bitcoin = require('bitcoinjs-lib');
  const node = bip32.fromBase58(xpub);
  const child = node.derive(0).derive(index);
  const payment = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(child.publicKey) });
  if (!payment?.address) throw new Error('Failed to derive address');
  return payment.address as string;
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
  const { BIP32Factory } = require('bip32');
  const ecc = require('tiny-secp256k1');
  const bip32 = BIP32Factory(ecc);
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed);
  const child = root.derivePath(`${DERIVATION_PATH}/0/${addressIndex}`);
  return child.toWIF();
};