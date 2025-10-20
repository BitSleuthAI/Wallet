// Note: Polyfills are already imported in polyfills.js and app/_layout.tsx
// This file only handles crypto and ECC initialization

// Ensure Buffer is available for bitcoinjs-lib
import { Buffer } from '@craftzdog/react-native-buffer';
(global as any).Buffer = Buffer;

// Initialize crypto and ECC library
export const initializeCrypto = async (forceReinit: boolean = false): Promise<boolean> => {
  try {
    console.log('🔧 Initializing crypto polyfills and ECC library...');
    console.log('🔧 Global crypto initialized flag:', (global as any).__cryptoInitialized);
    console.log('🔧 Force reinit:', forceReinit);
    
    // Add memory safety check
    if (typeof global === 'undefined') {
      throw new Error('Global object not available - possible memory corruption');
    }
    
    // Check if already initialized (unless force reinit)
    if ((global as any).__cryptoInitialized && !forceReinit) {
      console.log('✅ Crypto already initialized');
      // Verify ECC is actually available
      const ecc = (global as any).ecc;
      if (ecc) {
        console.log('✅ ECC verified available');
        return true;
      } else {
        console.warn('⚠️ Crypto flag set but ECC missing, reinitializing...');
        (global as any).__cryptoInitialized = false;
      }
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
    
    console.log('✅ ECC implementation validation passed');
    
    // Set the global ECC instance
    console.log('🔧 Setting global ECC instance...');
    (global as any).ecc = nobleECC;
    
    // Immediately verify it was set
    const eccVerify = (global as any).ecc;
    console.log('🔧 Global ECC set verification:', typeof eccVerify, eccVerify ? Object.keys(eccVerify) : 'null');
    
    if (!eccVerify) {
      console.error('❌ CRITICAL: Failed to set ECC on global object');
      throw new Error('Failed to set ECC on global object');
    }
    
    if (eccVerify !== nobleECC) {
      console.error('❌ CRITICAL: ECC on global does not match created instance');
      throw new Error('ECC on global does not match created instance');
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
    
    // Mark as initialized
    console.log('🔧 Marking crypto as initialized...');
    (global as any).__cryptoInitialized = true;
    
    console.log('✅ Crypto initialization completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to initialize crypto:', error);
    (global as any).__cryptoInitialized = false;
    return false;
  }
};