export interface Wallet {
  id: string;
  name: string;
  mnemonic: string;
  xpub: string;
  addresses: string[];
  currentAddressIndex: number;
  balance: number;
  balanceUSD: number;
}

export interface Transaction {
  txid: string;
  type: 'sent' | 'received';
  amount: number;
  amountUSD: number;
  address: string;
  timestamp: number;
  confirmations: number;
  status: 'pending' | 'confirmed';
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
  };
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
    error: string;
    border: string;
  };
}