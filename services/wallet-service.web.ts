import * as bip39 from 'bip39';
import { Wallet } from '@/types/wallet';

const DERIVATION_PATH = "m/84'/0'/0'";

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
  throw new Error('HD wallet operations are not available on web in Expo Go. Please open this project on a mobile device using the QR code.');
};

export const generateAddressFromXpub = async (_xpub: string, _index: number): Promise<string> => {
  throw new Error('Address derivation is not available on web in Expo Go. Please open this project on a mobile device using the QR code.');
};

export const generateNewAddress = async (wallet: Wallet): Promise<Wallet> => {
  throw new Error('Generating new addresses is not available on web in Expo Go. Please open this project on a mobile device using the QR code.');
};

export const getPrivateKey = async (_mnemonic: string, _addressIndex: number): Promise<string> => {
  throw new Error('Exporting private keys is not available on web in Expo Go. Please open this project on a mobile device using the QR code.');
};
