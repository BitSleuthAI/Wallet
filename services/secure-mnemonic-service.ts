/**
 * Secure Mnemonic Storage Service
 * 
 * Manages secure storage and retrieval of wallet mnemonics using Expo SecureStore.
 * 
 * Security Features:
 * - Uses device-level encryption (Keychain on iOS, Keystore on Android)
 * - Mnemonics never stored in plaintext AsyncStorage
 * - Automatic migration of existing plaintext mnemonics
 * - Secure deletion on wallet removal
 * 
 * Key Management:
 * - Mnemonics stored with wallet ID as key: `mnemonic_${walletId}`
 * - Each wallet's mnemonic is encrypted separately
 * - Migration tracked to prevent double-encryption
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key prefixes
const MNEMONIC_KEY_PREFIX = 'mnemonic_';
const MIGRATION_STATUS_KEY = 'mnemonic_migration_complete';
const MIGRATED_WALLETS_KEY = 'migrated_wallet_ids';

/**
 * Store a mnemonic securely for a wallet
 */
export async function storeMnemonic(walletId: string, mnemonic: string): Promise<void> {
  try {
    const key = `${MNEMONIC_KEY_PREFIX}${walletId}`;
    await SecureStore.setItemAsync(key, mnemonic);
    console.log(`🔐 Mnemonic securely stored for wallet: ${walletId}`);
  } catch (error) {
    console.error(`❌ Failed to store mnemonic for wallet ${walletId}:`, error);
    throw new Error('Failed to securely store mnemonic. Please try again.');
  }
}

/**
 * Retrieve a mnemonic securely for a wallet
 */
export async function getMnemonic(walletId: string): Promise<string | null> {
  try {
    const key = `${MNEMONIC_KEY_PREFIX}${walletId}`;
    const mnemonic = await SecureStore.getItemAsync(key);
    
    if (!mnemonic) {
      console.warn(`⚠️ No mnemonic found for wallet: ${walletId}`);
      return null;
    }
    
    console.log(`🔐 Mnemonic retrieved for wallet: ${walletId}`);
    return mnemonic;
  } catch (error) {
    console.error(`❌ Failed to retrieve mnemonic for wallet ${walletId}:`, error);
    throw new Error('Failed to retrieve mnemonic. Please try again.');
  }
}

/**
 * Delete a mnemonic securely for a wallet
 */
export async function deleteMnemonic(walletId: string): Promise<void> {
  try {
    const key = `${MNEMONIC_KEY_PREFIX}${walletId}`;
    await SecureStore.deleteItemAsync(key);
    console.log(`🗑️ Mnemonic deleted for wallet: ${walletId}`);
  } catch (error) {
    console.error(`❌ Failed to delete mnemonic for wallet ${walletId}:`, error);
    // Don't throw - deletion errors shouldn't block wallet removal
  }
}

/**
 * Check if a mnemonic exists for a wallet
 */
export async function hasMnemonic(walletId: string): Promise<boolean> {
  try {
    const key = `${MNEMONIC_KEY_PREFIX}${walletId}`;
    const mnemonic = await SecureStore.getItemAsync(key);
    return mnemonic !== null;
  } catch (error) {
    console.error(`❌ Failed to check mnemonic for wallet ${walletId}:`, error);
    return false;
  }
}

/**
 * Migrate existing plaintext mnemonics to secure storage
 * 
 * This function:
 * 1. Reads wallets from AsyncStorage
 * 2. For each wallet with a plaintext mnemonic, stores it securely
 * 3. Removes the mnemonic field from the wallet object
 * 4. Updates the wallet in AsyncStorage
 * 5. Marks migration as complete
 */
export async function migrateWalletMnemonics(): Promise<{
  success: boolean;
  migratedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migratedCount = 0;

  try {
    // Check if migration already completed
    const migrationComplete = await AsyncStorage.getItem(MIGRATION_STATUS_KEY);
    if (migrationComplete === 'true') {
      console.log('✅ Mnemonic migration already completed');
      return { success: true, migratedCount: 0, errors: [] };
    }

    console.log('🔄 Starting mnemonic migration to secure storage...');

    // Get all wallets from AsyncStorage
    const walletsData = await AsyncStorage.getItem('wallets');
    if (!walletsData) {
      console.log('ℹ️ No wallets found to migrate');
      await AsyncStorage.setItem(MIGRATION_STATUS_KEY, 'true');
      return { success: true, migratedCount: 0, errors: [] };
    }

    const wallets = JSON.parse(walletsData);
    const migratedWalletIds: string[] = [];

    // Track which wallets we've already migrated to prevent double-migration
    const previouslyMigratedData = await AsyncStorage.getItem(MIGRATED_WALLETS_KEY);
    const previouslyMigrated = previouslyMigratedData 
      ? new Set(JSON.parse(previouslyMigratedData))
      : new Set<string>();

    console.log(`📦 Found ${wallets.length} wallets to process`);

    // Migrate each wallet's mnemonic
    const updatedWallets = await Promise.all(
      wallets.map(async (wallet: any) => {
        try {
          // Skip if already migrated
          if (previouslyMigrated.has(wallet.id)) {
            console.log(`⏭️ Wallet ${wallet.id} already migrated, skipping`);
            return wallet;
          }

          // Check if wallet has a plaintext mnemonic
          if (wallet.mnemonic && typeof wallet.mnemonic === 'string') {
            console.log(`🔐 Migrating mnemonic for wallet: ${wallet.id} (${wallet.name})`);
            
            // Store mnemonic securely
            await storeMnemonic(wallet.id, wallet.mnemonic);
            
            // Remove mnemonic from wallet object
            const { mnemonic, ...walletWithoutMnemonic } = wallet;
            
            migratedCount++;
            migratedWalletIds.push(wallet.id);
            console.log(`✅ Migrated wallet: ${wallet.id}`);
            
            return walletWithoutMnemonic;
          }

          // Wallet doesn't have a plaintext mnemonic (already migrated or error)
          return wallet;
        } catch (error) {
          const errorMsg = `Failed to migrate wallet ${wallet.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          // Return original wallet to prevent data loss
          return wallet;
        }
      })
    );

    // Save updated wallets (without plaintext mnemonics)
    await AsyncStorage.setItem('wallets', JSON.stringify(updatedWallets));
    
    // Track migrated wallet IDs
    const allMigrated = [...Array.from(previouslyMigrated), ...migratedWalletIds];
    await AsyncStorage.setItem(MIGRATED_WALLETS_KEY, JSON.stringify(allMigrated));

    // Mark migration as complete only if no errors
    if (errors.length === 0) {
      await AsyncStorage.setItem(MIGRATION_STATUS_KEY, 'true');
      console.log(`✅ Mnemonic migration completed successfully. Migrated ${migratedCount} wallets.`);
    } else {
      console.warn(`⚠️ Mnemonic migration completed with errors. Migrated ${migratedCount} wallets, ${errors.length} errors.`);
    }

    return {
      success: errors.length === 0,
      migratedCount,
      errors,
    };
  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    errors.push(errorMsg);
    return {
      success: false,
      migratedCount,
      errors,
    };
  }
}

/**
 * Reset migration status (for testing or recovery)
 * WARNING: This should only be used in development or for recovery
 */
export async function resetMigrationStatus(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([MIGRATION_STATUS_KEY, MIGRATED_WALLETS_KEY]);
    console.log('🔄 Migration status reset');
  } catch (error) {
    console.error('❌ Failed to reset migration status:', error);
  }
}

/**
 * Delete all stored mnemonics (for logout/reset)
 */
export async function deleteAllMnemonics(walletIds: string[]): Promise<void> {
  try {
    console.log(`🗑️ Deleting mnemonics for ${walletIds.length} wallets...`);
    
    await Promise.all(
      walletIds.map(async (walletId) => {
        try {
          await deleteMnemonic(walletId);
        } catch (error) {
          console.warn(`⚠️ Failed to delete mnemonic for wallet ${walletId}:`, error);
        }
      })
    );
    
    console.log('✅ All mnemonics deleted');
  } catch (error) {
    console.error('❌ Failed to delete all mnemonics:', error);
  }
}
