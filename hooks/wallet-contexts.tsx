/**
 * Churn-domain contexts for the wallet store.
 *
 * WalletProvider (hooks/wallet-store.tsx) runs the store body once and
 * publishes each of its memoized slices through one of these contexts.
 * Components should subscribe via the narrow hooks below so they only
 * re-render when the slice they render actually changes — e.g. a component
 * that shows only the wallet list stops re-rendering on the 30s balance/
 * transaction polls. The legacy useWallet() hook (wallet-store.tsx)
 * subscribes to everything and remains for compatibility.
 *
 * The import from wallet-store is type-only, so there is no runtime cycle.
 */

import { createContext, useContext } from 'react';
import type { WalletStoreSlices } from '@/hooks/wallet-store';

export const WalletsContext = createContext<WalletStoreSlices['walletData'] | undefined>(undefined);
export const BalanceContext = createContext<WalletStoreSlices['balanceData'] | undefined>(undefined);
export const TransactionsContext = createContext<WalletStoreSlices['transactionData'] | undefined>(undefined);
export const AddressesContext = createContext<WalletStoreSlices['addressesData'] | undefined>(undefined);
export const UtxosContext = createContext<WalletStoreSlices['utxosData'] | undefined>(undefined);
export const SettingsContext = createContext<WalletStoreSlices['settingsData'] | undefined>(undefined);
export const ActionsContext = createContext<WalletStoreSlices['actionsData'] | undefined>(undefined);
export const CoinControlContext = createContext<WalletStoreSlices['coinControlData'] | undefined>(undefined);
export const FeedbackContext = createContext<WalletStoreSlices['feedbackData'] | undefined>(undefined);
export const WalletMetaContext = createContext<WalletStoreSlices['metaData'] | undefined>(undefined);

/** Wallet list, current wallet, and wallet CRUD state. Changes on wallet add/remove/switch/edit — not on data polls. */
export function useWallets() {
  const value = useContext(WalletsContext);
  if (value === undefined) {
    throw new Error('useWallets must be used within WalletProvider');
  }
  return value;
}

/** Balance + BTC price. Changes on the 30s poll when values actually move. */
export function useWalletBalance() {
  const value = useContext(BalanceContext);
  if (value === undefined) {
    throw new Error('useWalletBalance must be used within WalletProvider');
  }
  return value;
}

/** Transaction history. Changes on the 30s poll when new txs arrive. */
export function useWalletTransactions() {
  const value = useContext(TransactionsContext);
  if (value === undefined) {
    throw new Error('useWalletTransactions must be used within WalletProvider');
  }
  return value;
}

/** Discovered addresses. Changes on the 60s discovery poll. */
export function useWalletAddresses() {
  const value = useContext(AddressesContext);
  if (value === undefined) {
    throw new Error('useWalletAddresses must be used within WalletProvider');
  }
  return value;
}

/** UTXO set. Changes on the 30s poll when UTXOs change. */
export function useWalletUtxos() {
  const value = useContext(UtxosContext);
  if (value === undefined) {
    throw new Error('useWalletUtxos must be used within WalletProvider');
  }
  return value;
}

/** Currency, hide-balance, auto-lock, fee settings. Rare, user-driven churn. */
export function useWalletSettings() {
  const value = useContext(SettingsContext);
  if (value === undefined) {
    throw new Error('useWalletSettings must be used within WalletProvider');
  }
  return value;
}

/** Stable store actions (createWallet, switchWallet, refreshData, formatCurrency, ...). */
export function useWalletActions() {
  const value = useContext(ActionsContext);
  if (value === undefined) {
    throw new Error('useWalletActions must be used within WalletProvider');
  }
  return value;
}

/** Coin-control selection/freeze state and helpers. */
export function useCoinControl() {
  const value = useContext(CoinControlContext);
  if (value === undefined) {
    throw new Error('useCoinControl must be used within WalletProvider');
  }
  return value;
}

/** Feedback-prompt state and usage tracking. */
export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (value === undefined) {
    throw new Error('useFeedback must be used within WalletProvider');
  }
  return value;
}

/** Loose store fields: isCreatingWallet, address-stats cache helpers, getMnemonic. */
export function useWalletMeta() {
  const value = useContext(WalletMetaContext);
  if (value === undefined) {
    throw new Error('useWalletMeta must be used within WalletProvider');
  }
  return value;
}
