/**
 * Wallet Service Loader Utility
 * 
 * Provides a centralized way to load wallet service functions across different screens
 * with proper error handling and platform detection.
 */

import { Platform } from 'react-native';
import type { Wallet } from '@/types/wallet';

export interface WalletService {
  generateAddressFromXpub: (xpub: string, index: number) => Promise<string>;
  generateNewAddress: (wallet: Wallet) => Promise<Wallet>;
  generateAddressesForView: (
    xpub: string,
    chainType: 'receiving' | 'change'
  ) => Promise<Array<{
    address: string;
    index: number;
    isUsed: boolean;
    balance: number;
    txCount: number;
    receivedCount: number;
    sentCount: number;
    type: 'receiving' | 'change';
  }>>;
  generateAddressBatchForView?: (
    xpub: string,
    startIndex: number,
    batchSize?: number
  ) => Promise<Array<{
    address: string;
    index: number;
    isUsed: boolean;
    balance: number;
    txCount: number;
    receivedCount: number;
    sentCount: number;
  }>>;
  getFirstUnusedReceivingAddress?: (xpub: string) => Promise<string | null>;
  clearAddressCache?: (xpub?: string) => void;
}

/**
 * Load wallet service with proper error handling
 * @param requiredFunctions - Array of function names that must be available
 * @returns Wallet service object with requested functions
 */
export function loadWalletService(requiredFunctions: string[] = []): WalletService {
  try {
    console.log('📦 Loading wallet service for platform:', Platform.OS);
    
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const importedService = require('@/services/wallet-service');
    
    console.log('📦 Imported service keys:', Object.keys(importedService));
    
    // Create wallet service object with proper typing
    const walletService: Partial<WalletService> = {};
    
    const allFunctions: Array<keyof WalletService> = [
      'generateAddressFromXpub',
      'generateNewAddress',
      'generateAddressesForView',
      'generateAddressBatchForView',
      'getFirstUnusedReceivingAddress',
      'clearAddressCache',
    ];
    
    // Include all available functions
    allFunctions.forEach(funcName => {
      if (typeof importedService[funcName] === 'function') {
        (walletService as any)[funcName] = importedService[funcName];
      }
    });
    
    // Verify required functions are available
    if (requiredFunctions.length > 0) {
      const missingFunctions = requiredFunctions.filter(
        func => typeof (walletService as any)[func] !== 'function'
      );
      
      if (missingFunctions.length > 0) {
        throw new Error(
          `Missing required wallet service functions: ${missingFunctions.join(', ')}`
        );
      }
    }
    
    console.log('✅ Wallet service loaded successfully for', Platform.OS);
    return walletService as WalletService;
  } catch (error) {
    console.error('❌ Failed to load wallet service for', Platform.OS, ':', error);
    
    // Provide a minimal fallback with proper typing
    const fallback: WalletService = {
      generateAddressFromXpub: async () => {
        throw new Error('Wallet service not available');
      },
      generateNewAddress: async () => {
        throw new Error('Wallet service not available');
      },
      generateAddressesForView: async () => {
        throw new Error('Wallet service not available');
      },
      getFirstUnusedReceivingAddress: async () => {
        throw new Error('Wallet service not available');
      },
      clearAddressCache: () => {
        console.warn('Wallet service not available');
      },
    };
    
    return fallback;
  }
}
