// Note: Polyfills are already imported in polyfills.js and app/_layout.tsx
// This file only handles crypto and ECC initialization

// Ensure Buffer is available for bitcoinjs-lib
import { Buffer } from '@craftzdog/react-native-buffer';
// Guard against environments where `global` may be unavailable; fall back to globalThis
const rootGlobal: any = typeof global !== 'undefined' ? (global as any) : (typeof globalThis !== 'undefined' ? (globalThis as any) : undefined);
if (rootGlobal) {
  rootGlobal.Buffer = Buffer;
}

// Initialize crypto and ECC library
export const initializeCrypto = async (
  forceReinit: boolean = false,
  signal?: AbortSignal,
): Promise<boolean> => {
  // Resolve the global object reference safely before any usage
  let g: any = typeof global !== 'undefined' ? (global as any) : (typeof globalThis !== 'undefined' ? (globalThis as any) : undefined);
  try {
    // Add memory safety check BEFORE any access that may rely on the global object
    if (!g) {
      throw new Error('Global object not available - possible memory corruption');
    }

    console.log('🔧 Initializing crypto polyfills and ECC library...');
    // Check for abort as early as possible
    if (signal?.aborted) {
      console.warn('⚠️ Crypto initialization aborted before start');
      return false;
    }
    console.log('🔧 Global crypto initialized flag:', g.__cryptoInitialized);
    console.log('🔧 Force reinit:', forceReinit);
    
    // Check if already initialized (unless force reinit)
    if (g.__cryptoInitialized && !forceReinit) {
      console.log('✅ Crypto already initialized');
      // Verify ECC is actually available
      const ecc = g.ecc;
      if (ecc) {
        console.log('✅ ECC verified available');
        return true;
      } else {
        console.warn('⚠️ Crypto flag set but ECC missing, reinitializing...');
        g.__cryptoInitialized = false;
      }
    }
    
    // Check for abort before heavy work
    if (signal?.aborted) {
      console.warn('⚠️ Crypto initialization aborted before ECC creation');
      return false;
    }

    let nobleECC;
    
    try {
      // Try to create the full noble ECC implementation
      const { createNobleECC } = require('./ecc-override');
      nobleECC = createNobleECC();
      console.log('✅ Noble ECC implementation created successfully');
    } catch (eccError) {
      console.error('❌ Failed to create noble ECC implementation:', eccError);
      throw new Error('Cryptographic library initialization failed. The wallet cannot operate securely without proper ECC support.');
    }
    
    // Check for abort after ECC creation
    if (signal?.aborted) {
      console.warn('⚠️ Crypto initialization aborted after ECC creation');
      return false;
    }

    // Validate ECC implementation before using it
    console.log('🔧 Validating ECC implementation...');
    
    // Test basic ECC functionality
    const testPrivateKey = new Uint8Array(32);
    testPrivateKey[31] = 1; // Set to 1 to ensure it's a valid private key
    
    // Test private key validation
    if (!nobleECC.isPrivate(testPrivateKey)) {
      throw new Error('ECC private key validation failed');
    }
    
    // Test point generation
    const publicKey = nobleECC.pointFromScalar(testPrivateKey, true);
    if (!publicKey || publicKey.length !== 33) {
      throw new Error('ECC point generation failed');
    }
    
    // Test signing and verification
    const testHash = new Uint8Array(32);
    testHash.fill(0xaa); // Fill with test data
    
    const signature = nobleECC.sign(testHash, testPrivateKey);
    if (!signature || signature.length === 0) {
      throw new Error('ECC signing failed');
    }
    
    const isValid = nobleECC.verify(testHash, publicKey, signature);
    if (!isValid) {
      throw new Error('ECC signature verification failed');
    }
    
    // Check for abort after validation
    if (signal?.aborted) {
      console.warn('⚠️ Crypto initialization aborted after validation');
      return false;
    }

    console.log('✅ ECC implementation validation passed');
    
    // Set the global ECC instance
    console.log('🔧 Setting global ECC instance...');
    g.ecc = nobleECC;
    
    // Immediately verify it was set
    const eccVerify = g.ecc;
    console.log('🔧 Global ECC set verification:', typeof eccVerify, eccVerify ? Object.keys(eccVerify) : 'null');
    
    if (!eccVerify) {
      console.error('❌ CRITICAL: Failed to set ECC on global object');
      throw new Error('Failed to set ECC on global object');
    }
    
    if (eccVerify !== nobleECC) {
      console.error('❌ CRITICAL: ECC on global does not match created instance');
      throw new Error('ECC on global does not match created instance');
    }
    
    // Check for abort before bitcoinjs-lib work
    if (signal?.aborted) {
      console.warn('⚠️ Crypto initialization aborted before bitcoinjs-lib setup');
      return false;
    }

    console.log('✅ ECC successfully set and verified on global object');
    
    // Initialize bitcoinjs-lib with our ECC implementation
    try {
      console.log('🔧 Loading bitcoinjs-lib for crypto polyfill...');
      let bitcoin;
      try {
        bitcoin = require('bitcoinjs-lib');
      } catch (requireError) {
        console.log('⚠️ bitcoinjs-lib require() failed in crypto polyfill, skipping...');
        // Don't return early - continue to set the crypto initialized flag
      }
      
      if (bitcoin) {
        console.log('🔧 BitcoinJS loaded in crypto polyfill:', typeof bitcoin, Object.keys(bitcoin));
        
        if (typeof bitcoin.initEccLib === 'function') {
          console.log('🔧 Initializing bitcoinjs-lib with ECC in crypto polyfill...');
          bitcoin.initEccLib(nobleECC);
          console.log('✅ BitcoinJS initialized with ECC');
        } else {
          console.log('⚠️ bitcoinjs-lib.initEccLib not available in crypto polyfill, continuing without it');
        }
      } else {
        console.log('⚠️ bitcoinjs-lib not loaded in crypto polyfill, continuing without it');
      }
    } catch (bitcoinError) {
      console.warn('⚠️ BitcoinJS initialization failed, continuing without it:', bitcoinError);
    }
    
    // Final abort check before setting initialized flag
    if (signal?.aborted) {
      console.warn('⚠️ Crypto initialization aborted before finalize');
      // Clean up ECC instance to maintain consistent state
      if (g.ecc) {
        console.log('🔧 Cleaning up ECC instance due to abort');
        g.ecc = undefined;
      }
      return false;
    }

    // Mark as initialized
    console.log('🔧 Marking crypto as initialized...');
    g.__cryptoInitialized = true;
    
    console.log('✅ Crypto initialization completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to initialize crypto:', error);
    // Safely attempt to mark as uninitialized if a global root exists
    const safeGlobal: any = g || (typeof global !== 'undefined' ? (global as any) : (typeof globalThis !== 'undefined' ? (globalThis as any) : undefined));
    if (safeGlobal) {
      safeGlobal.__cryptoInitialized = false;
    }
    return false;
  }
};