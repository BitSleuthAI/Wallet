// Import polyfills at the very top of your app
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Buffer polyfill
import { Buffer } from '@craftzdog/react-native-buffer';
(global as any).Buffer = Buffer;

// Stream polyfill for React Native
// @ts-ignore - stream-browserify doesn't have types
import { Readable, Transform, Writable } from 'stream-browserify';
(global as any).stream = { Readable, Writable, Transform };

// Events polyfill for React Native
import { EventEmitter } from 'events';
if (typeof (global as any).EventEmitter === 'undefined') {
  (global as any).EventEmitter = EventEmitter;
}

// Note: react-native-get-random-values is imported at the top for side effects
// It automatically polyfills crypto.getRandomValues, so no manual assignment needed

// Ensure process is available
if (typeof (global as any).process === 'undefined') {
  (global as any).process = require('process');
}

// Additional Node.js polyfills
if (typeof (global as any).util === 'undefined') {
  (global as any).util = require('util');
}

if (typeof (global as any).assert === 'undefined') {
  (global as any).assert = require('assert');
}

if (typeof (global as any).url === 'undefined') {
  (global as any).url = require('url');
}

if (typeof (global as any).querystring === 'undefined') {
  (global as any).querystring = require('querystring-es3');
}

// Initialize crypto and ECC library
export const initializeCrypto = async (): Promise<boolean> => {
  try {
    console.log('🔧 Initializing crypto polyfills and ECC library...');
    
    // Check if already initialized
    if ((global as any).__cryptoInitialized) {
      console.log('✅ Crypto already initialized');
      return true;
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
    (global as any).ecc = nobleECC;
    
    // Initialize bitcoinjs-lib with our ECC implementation
    try {
      const bitcoin = require('bitcoinjs-lib');
      if (typeof bitcoin.initEccLib === 'function') {
        bitcoin.initEccLib(nobleECC);
        console.log('✅ BitcoinJS initialized with ECC');
      }
    } catch (bitcoinError) {
      console.warn('⚠️ BitcoinJS initialization failed:', bitcoinError);
    }
    
    // Mark as initialized
    (global as any).__cryptoInitialized = true;
    
    console.log('✅ Crypto initialization completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to initialize crypto:', error);
    (global as any).__cryptoInitialized = false;
    return false;
  }
};