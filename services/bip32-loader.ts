/**
 * Centralized BIP32 Module Loader
 * Provides consistent bip32 loading across all services with proper error handling and caching
 */

// Import bip32 with better error handling
let bip32: any;
let bip32LoadPromise: Promise<any> | null = null;

/**
 * Create BIP32Factory wrapper for @scure/bip32 compatibility
 */
function createBIP32Factory(HDKey: any) {
  return (ecc: any) => ({
    fromSeed: (seed: Uint8Array) => {
      const hdkey = HDKey.fromMasterSeed(seed);
      
      // Create a wrapper that provides consistent interface for @scure/bip32 HDKey
      const wrappedHdkey = {
        ...hdkey,
        derive: (pathOrIndex: string | number) => {
          console.log('🔧 Custom derive called with:', typeof pathOrIndex === 'number' ? `index: ${pathOrIndex}` : `path: ${pathOrIndex}`);
          return hdkey.derive(pathOrIndex);
        },
        derivePath: (path: string) => {
          console.log('🔧 derivePath called with path:', path);
          return hdkey.derive(path);
        },
        deriveChild: (index: number) => {
          console.log('🔧 deriveChild called with index:', index);
          return hdkey.derive(index);
        }
      };
      
      return wrappedHdkey;
    },
    fromBase58: (base58: string) => {
      const hdkey = HDKey.fromExtendedKey(base58);
      
      // Create a wrapper that provides consistent interface for @scure/bip32 HDKey
      const wrappedHdkey = {
        ...hdkey,
        derive: (pathOrIndex: string | number) => {
          console.log('🔧 Custom derive called with:', typeof pathOrIndex === 'number' ? `index: ${pathOrIndex}` : `path: ${pathOrIndex}`);
          return hdkey.derive(pathOrIndex);
        },
        derivePath: (path: string) => {
          console.log('🔧 derivePath called with path:', path);
          return hdkey.derive(path);
        },
        deriveChild: (index: number) => {
          console.log('🔧 deriveChild called with index:', index);
          return hdkey.derive(index);
        }
      };
      
      return wrappedHdkey;
    },
  });
}

/**
 * Load bip32 module with proper error handling and caching
 * This function ensures that successful loads update the module-level variable
 * and failed loads don't permanently cache the failure
 */
export async function loadBip32Module(): Promise<any> {
  // If already loaded at module level, return it
  if (bip32) {
    return bip32;
  }
  
  // If we have a pending promise, await it
  if (bip32LoadPromise) {
    const result = await bip32LoadPromise;
    // Update module-level variable if successful
    if (result) {
      bip32 = result;
    }
    return result;
  }
  
  // Try module-level loading first
  try {
    const module = require('@scure/bip32');
    console.log('✅ @scure/bip32 loaded at module level:', typeof module, Object.keys(module));
    
    const HDKey = module.HDKey;
    if (HDKey) {
      console.log('🔧 Creating BIP32Factory wrapper for module-level loaded @scure/bip32');
      const bip32Factory = createBIP32Factory(HDKey);
      module.BIP32Factory = bip32Factory;
      console.log('✅ BIP32Factory added to module:', typeof module.BIP32Factory);
      bip32 = module;
      return module;
    } else {
      console.error('❌ HDKey not found in @scure/bip32 module');
      // Create a stub object with BIP32Factory that throws proper error
      const stubModule = {
        BIP32Factory: () => {
          throw new Error('BIP32 module or BIP32Factory not available - HDKey missing from @scure/bip32');
        }
      };
      bip32 = stubModule;
      return stubModule;
    }
  } catch (error) {
    console.warn('⚠️ Failed to load @scure/bip32 at module level:', error);
  }
  
  // Set up dynamic import as fallback
  console.log('🔧 Setting up @scure/bip32 dynamic import fallback...');
  bip32LoadPromise = import('@scure/bip32').then(module => {
    console.log('✅ @scure/bip32 loaded via dynamic import:', typeof module);
    console.log('🔧 @scure/bip32 module keys:', Object.keys(module));
    
    const HDKey = module.HDKey;
    console.log('🔧 HDKey exists:', typeof HDKey);
    
    if (!HDKey) {
      console.error('❌ HDKey not found in @scure/bip32 module');
      // Create a stub object with BIP32Factory that throws proper error
      const stubModule = {
        BIP32Factory: () => {
          throw new Error('BIP32 module or BIP32Factory not available - HDKey missing from @scure/bip32');
        }
      };
      return stubModule;
    }
    
    const bip32Factory = createBIP32Factory(HDKey);
    console.log('🔧 Created BIP32Factory wrapper:', typeof bip32Factory);
    
    const result = {
      BIP32Factory: bip32Factory,
      ...module
    };
    
    console.log('🔧 Returning bip32 module:', typeof result, Object.keys(result));
    return result;
  }).catch(dynamicError => {
    console.error('❌ Failed to load @scure/bip32 via dynamic import:', dynamicError);
    console.error('❌ Error details:', dynamicError.message, dynamicError.stack);
    // Don't cache the failure - reset the promise so it can be retried
    bip32LoadPromise = null;
    throw dynamicError;
  });
  
  console.log('🔧 bip32LoadPromise created:', typeof bip32LoadPromise);
  
  try {
    const result = await bip32LoadPromise;
    // Update module-level variable on successful load
    if (result) {
      bip32 = result;
    }
    return result;
  } catch (error) {
    // Reset the promise on failure so it can be retried
    bip32LoadPromise = null;
    throw error;
  }
}

/**
 * Get the currently loaded bip32 module (synchronous)
 * Returns null if not loaded
 */
export function getBip32Module(): any {
  return bip32;
}

/**
 * Clear the bip32 module cache (useful for testing or recovery)
 */
export function clearBip32Cache(): void {
  bip32 = null;
  bip32LoadPromise = null;
  console.log('🗑️ Cleared bip32 module cache');
}

// Try initial module-level loading
try {
  bip32 = require('@scure/bip32');
  console.log('✅ @scure/bip32 loaded at module level:', typeof bip32, Object.keys(bip32));
  
  const HDKey = bip32.HDKey;
  if (HDKey) {
    console.log('🔧 Creating BIP32Factory wrapper for module-level loaded @scure/bip32');
    const bip32Factory = createBIP32Factory(HDKey);
    bip32.BIP32Factory = bip32Factory;
    console.log('✅ BIP32Factory added to module:', typeof bip32.BIP32Factory);
  } else {
    console.error('❌ HDKey not found in @scure/bip32 module');
    // Create a stub object with BIP32Factory that throws proper error
    bip32 = {
      BIP32Factory: () => {
        throw new Error('BIP32 module or BIP32Factory not available - HDKey missing from @scure/bip32');
      }
    };
  }
} catch (error) {
  console.warn('⚠️ Failed to load @scure/bip32 at module level:', error);
  // Create a stub object with BIP32Factory that throws proper error
  bip32 = {
    BIP32Factory: () => {
      throw new Error('BIP32 module or BIP32Factory not available - @scure/bip32 failed to load');
    }
  };
}
