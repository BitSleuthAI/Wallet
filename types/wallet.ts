export type WalletType = 'hd' | 'segwit-p2sh' | 'segwit-native' | 'legacy';
export type AddressType = 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh';
export type FiatCurrency = 'USD' | 'EUR' | 'GBP';

// Wallet type display names for consistent UI
export const WALLET_TYPE_DISPLAY_NAMES: Record<WalletType, string> = {
  'segwit-native': 'Native SegWit (P2WPKH)',
  'segwit-p2sh': 'Nested SegWit & Script (P2SH)',
  'legacy': 'Legacy (P2PKH)',
  'hd': 'HD Wallet (P2WPKH)'
};

// Function to get display name for wallet type
export const getWalletTypeDisplayName = (walletType: WalletType): string => {
  return WALLET_TYPE_DISPLAY_NAMES[walletType] || walletType;
};

export interface Wallet {
  id: string;
  name: string;
  color: string;
  type: WalletType;
  addressType: AddressType;
  mnemonic: string;
  xpub: string;
  addresses: string[];
  currentAddressIndex: number;
  balance: number;
  balanceUSD: number;
  derivationPath: string;
  gap: number; // Address gap for discovery
  isHardwareWallet?: boolean;
  createdAt: number;
  lastSyncAt?: number;
}

export interface Transaction {
  txid: string;
  type: 'sent' | 'received';
  amount: number;
  amountUSD: number;
  address: string;
  timestamp: number;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  fee?: number;
  feeRate?: number; // sat/vB
  size?: number; // transaction size in bytes
  vsize?: number; // virtual size
  rbf?: boolean; // Replace-by-fee enabled
  cpfp?: boolean; // Child-pays-for-parent enabled
  parentTxid?: string; // For CPFP child transactions
  childTxids?: string[]; // For CPFP parent transactions
  inputs?: TransactionInput[];
  outputs?: TransactionOutput[];
  blockHeight?: number;
  blockHash?: string;
  memo?: string;
  labels?: string[];
}

export interface TransactionInput {
  txid: string;
  vout: number;
  value: number;
  address?: string;
  scriptSig?: string;
  witness?: string[];
}

export interface TransactionOutput {
  value: number;
  address?: string;
  scriptPubKey?: string;
  n: number;
  spent?: boolean;
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  address?: string;
  addressIndex?: number; // Index of the address in the wallet's address array
  scriptPubKey?: string;
  frozen?: boolean; // For coin control
  label?: string;
  confirmations?: number;
}

export interface FeeEstimate {
  fastestFee: number; // ~10 min
  halfHourFee: number; // ~30 min
  hourFee: number; // ~60 min
  economyFee: number; // ~3 hours
  minimumFee: number; // ~24 hours
}

export interface SendTransactionParams {
  toAddress: string;
  amount: number; // in BTC
  feeRate?: number; // sat/vB
  memo?: string;
  utxos?: UTXO[]; // For coin control
  rbf?: boolean;
}

export interface WalletSettings {
  fiatCurrency: FiatCurrency;
  autoLockTimeout: number; // minutes
  biometricEnabled: boolean;
  pinEnabled: boolean;
  hideBalance: boolean;
  enableRBF: boolean;
  enableCPFP: boolean;
  defaultFeeRate: 'fast' | 'medium' | 'slow' | 'custom';
  customFeeRate?: number;
  addressGap: number;
  enableCoinControl: boolean;
}

export interface BitcoinPrice {
  usd: number;
  usd_24h_change: number;
}

export interface Theme {
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
    border: string;
    accent: string;
    // Gradient colors
    gradientStart: string;
    gradientEnd: string;
    gradientAccent: string;
    // Glow effects
    glowPrimary: string;
    glowSecondary: string;
    glowAccent: string;
    // Additional colors
    purple: string;
    blue: string;
    green: string;
    orange: string;
    pink: string;
    yellow: string;
    // Surface variants
    surfaceLight: string;
    surfaceDark: string;
    // Card backgrounds
    cardBackground: string;
    cardBorder: string;
  };
}

// CPFP (Child-Pays-for-Parent) related types
export interface CPFPTransaction {
  parentTxid: string;
  childTxid?: string;
  parentTx: Transaction;
  childTx?: string; // hex transaction
  targetFeeRate: number;
  childFee: number;
  effectiveFeeRate: number; // Combined fee rate of parent + child
  status: 'pending' | 'broadcasted' | 'confirmed' | 'failed';
  error?: string;
}

export interface CPFPValidationResult {
  isValid: boolean;
  canCPFP: boolean;
  reason?: string;
  parentTx?: any;
  utxos?: UTXO[];
  estimatedChildFee?: number;
  effectiveFeeRate?: number;
}

export interface CPFPOptions {
  targetFeeRate: number;
  maxChildFee?: number;
  includeUnconfirmed?: boolean;
  customOutputs?: Array<{ address: string; amount: number }>;
}

export interface CPFPRecommendation {
  recommendedFeeRate: number;
  estimatedChildFee: number;
  effectiveFeeRate: number;
  timeEstimate: string;
}