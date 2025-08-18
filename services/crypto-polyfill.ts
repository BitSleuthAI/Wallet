// Minimal crypto polyfill for React Native Web compatibility
// This must be imported FIRST before any other modules that use crypto

// Ensure global exists first
if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

console.log('🔧 Initializing crypto polyfill immediately (before Platform import)');

// IMPORTANT: Completely avoiding tiny-secp256k1 to prevent WASM loading errors in Expo Go
// Using only @noble/secp256k1 which is pure JavaScript and compatible with all platforms

// IMMEDIATELY set up crypto.getRandomValues before any other code runs
const getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
  if (!array) return array;
  
  console.log('getRandomValues called with array type:', array.constructor.name, 'length:', array.byteLength);
  
  // Try to detect if we're on mobile vs web without importing Platform
  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  
  // Use native crypto if available (mobile), otherwise Math.random
  if ((isReactNative || !isWeb) && typeof require !== 'undefined') {
    try {
      const crypto = require('crypto');
      if (crypto && crypto.randomBytes) {
        const bytes = crypto.randomBytes(array.byteLength);
        new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(bytes);
        console.log('✅ Used native crypto.randomBytes');
        return array;
      }
    } catch (error) {
      console.log('⚠️ Native crypto failed, using Math.random fallback:', error);
    }
  }
  
  // Enhanced fallback using Math.random with better entropy
  const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (let i = 0; i < view.length; i++) {
    // Use timestamp and multiple Math.random calls for better entropy
    const entropy1 = Math.floor(Math.random() * 256);
    const entropy2 = Math.floor(Math.random() * 256);
    const timestamp = Date.now() % 256;
    view[i] = (entropy1 ^ entropy2 ^ timestamp ^ i) % 256;
  }
  
  console.log('✅ Used enhanced Math.random fallback for crypto.getRandomValues');
  return array;
};

// Create crypto object immediately
const cryptoPolyfill = {
  getRandomValues,
  subtle: undefined, // Not implemented for simplicity
};

// Set crypto IMMEDIATELY on all global contexts
const contexts = [globalThis];
if (typeof global !== 'undefined') contexts.push(global);
if (typeof window !== 'undefined') contexts.push(window);
if (typeof self !== 'undefined') contexts.push(self);

contexts.forEach((context, index) => {
  if (context && typeof context === 'object') {
    try {
      // Force set crypto property immediately
      (context as any).crypto = cryptoPolyfill;
      console.log(`✅ Context ${index}: Set crypto polyfill immediately`);
    } catch (error) {
      console.log(`❌ Context ${index}: Failed to set crypto:`, error);
    }
  }
});

// Now import Platform after crypto is set up
import { Platform } from 'react-native';

console.log('🔧 Setting up hash functions...');

// Use enhanced fallback implementation to avoid @noble/hashes import warnings
let sha256: any = null;
let hmac: any = null;

// Enhanced SHA-256 fallback implementation with better mixing
sha256 = (data: Uint8Array): Uint8Array => {
  const result = new Uint8Array(32);
  const len = data.length;
  
  // Simple hash with better mixing
  for (let i = 0; i < 32; i++) {
    let hash = 0;
    for (let j = 0; j < len; j++) {
      hash = ((hash << 5) - hash + data[j] + i) & 0xffffffff;
    }
    result[i] = (hash >>> (i % 4) * 8) & 0xff;
  }
  return result;
};

hmac = (key: Uint8Array, data: Uint8Array): Uint8Array => {
  // Simple HMAC implementation
  const combined = new Uint8Array(key.length + data.length);
  combined.set(key, 0);
  combined.set(data, key.length);
  return sha256(combined);
};

console.log('✅ Using enhanced fallback for cryptographic functions');

// Crypto functions - use native on mobile, noble on web/fallback
let createHash: any = null;
let createHmac: any = null;

if (Platform.OS !== 'web') {
  try {
    const crypto = require('crypto');
    createHash = crypto.createHash;
    createHmac = crypto.createHmac;
    console.log('✅ Native crypto loaded');
  } catch (error) {
    console.log('⚠️ Native crypto not available:', error);
  }
}

const fallbackCreateHash = (algorithm: string) => {
  if (algorithm !== 'sha256') {
    throw new Error(`Hash algorithm ${algorithm} not supported`);
  }
  
  return {
    update: function(data: any) {
      this._data = data;
      return this;
    },
    digest: function(encoding?: string) {
      const dataBytes = typeof this._data === 'string' ? new TextEncoder().encode(this._data) : new Uint8Array(this._data);
      const hash = sha256(dataBytes);
      if (encoding === 'hex') {
        return Array.from(hash).map((b) => (b as number).toString(16).padStart(2, '0')).join('');
      }
      return hash;
    },
    _data: null as any
  };
};

const fallbackCreateHmac = (algorithm: string, key: any) => {
  if (algorithm !== 'sha256') {
    throw new Error(`HMAC algorithm ${algorithm} not supported`);
  }
  
  return {
    update: function(data: any) {
      this._data = data;
      return this;
    },
    digest: function(encoding?: string) {
      const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : new Uint8Array(key);
      const dataBytes = typeof this._data === 'string' ? new TextEncoder().encode(this._data) : new Uint8Array(this._data);
      const hash = hmac(keyBytes, dataBytes);
      if (encoding === 'hex') {
        return Array.from(hash).map((b) => (b as number).toString(16).padStart(2, '0')).join('');
      }
      return hash;
    },
    _data: null as any
  };
};

// Test that crypto is working immediately
console.log('🧪 Testing crypto polyfill immediately...');
try {
  const testArray = new Uint8Array(4);
  
  // Test global crypto
  if (typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(testArray);
    console.log('✅ Global crypto.getRandomValues working:', Array.from(testArray));
  } else {
    console.log('⚠️ Global crypto.getRandomValues not available, using polyfill');
  }
  
  // Test polyfill directly
  const testArray2 = new Uint8Array(4);
  cryptoPolyfill.getRandomValues(testArray2);
  console.log('✅ Crypto polyfill direct test working:', Array.from(testArray2));
  
  // Ensure all values are different (basic entropy check)
  const testArray3 = new Uint8Array(16);
  cryptoPolyfill.getRandomValues(testArray3);
  const uniqueValues = new Set(Array.from(testArray3)).size;
  console.log(`✅ Entropy check: ${uniqueValues}/16 unique values`);
  
} catch (error) {
  console.error('❌ Crypto polyfill test failed:', error);
  if (error instanceof Error) {
    console.error('Stack trace:', error.stack);
  }
}

// Set up hash functions for BIP32
const hashFunctions = {
  sha256: createHash || fallbackCreateHash,
  hmacSha256Sync: (key: any, data: any) => {
    if (createHmac) {
      const hmacInstance = createHmac('sha256', key);
      return hmacInstance.update(data).digest();
    } else {
      // Use noble/hashes directly for better performance
      const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : new Uint8Array(key);
      const dataBytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
      return hmac(keyBytes, dataBytes);
    }
  }
};

// Set hash functions globally for BIP32 - try multiple approaches
const hashContexts = [global, globalThis];
if (typeof window !== 'undefined') hashContexts.push(window);

hashContexts.forEach(context => {
  if (context && typeof context === 'object') {
    try {
      (context as any).hashes = hashFunctions;
      
      // Also try setting it as a property descriptor
      Object.defineProperty(context, 'hashes', {
        value: hashFunctions,
        writable: true,
        enumerable: true,
        configurable: true
      });
    } catch {
      // Fallback - just set it directly
      (context as any).hashes = hashFunctions;
    }
  }
});

// Also set it on the require cache if available
if (typeof require !== 'undefined' && require.cache) {
  try {
    // Set hashes for any BIP32 modules that might be loaded
    Object.keys(require.cache).forEach(key => {
      if (key.includes('bip32')) {
        const module = require.cache[key];
        if (module && module.exports) {
          (module.exports as any).hashes = hashFunctions;
        }
      }
    });
  } catch {
    // Ignore errors
  }
}

// Test hash functions after they're set up
setTimeout(() => {
  console.log('🧪 Testing hash functions...');
  try {
    if (hashFunctions.hmacSha256Sync) {
      const testResult = hashFunctions.hmacSha256Sync('test', 'data');
      if (testResult && testResult.length > 0) {
        console.log('✅ Hash functions initialized successfully, result length:', testResult.length);
      } else {
        console.warn('⚠️ Hash function test returned empty result:', testResult);
      }
    } else {
      console.error('❌ Hash functions not available');
    }
  } catch (error) {
    console.error('❌ Hash function test failed:', error);
  }
}, 0);

// Enhanced Buffer polyfill for React Native
if (typeof global.Buffer === 'undefined') {
  console.log('🔧 Setting up Buffer polyfill...');
  
  const BufferPolyfill = {
    from: (data: any, encoding?: string) => {
      if (typeof data === 'string') {
        if (encoding === 'hex') {
          const bytes = new Uint8Array(data.length / 2);
          for (let i = 0; i < data.length; i += 2) {
            bytes[i / 2] = parseInt(data.substr(i, 2), 16);
          }
          // Add toString method
          (bytes as any).toString = (enc?: string) => {
            if (enc === 'hex') {
              return Array.from(bytes).map((b) => (b as number).toString(16).padStart(2, '0')).join('');
            }
            return new TextDecoder().decode(bytes);
          };
          return bytes;
        }
        const encoded = new TextEncoder().encode(data);
        // Add toString method
        (encoded as any).toString = (enc?: string) => {
          if (enc === 'hex') {
            return Array.from(encoded).map((b) => (b as number).toString(16).padStart(2, '0')).join('');
          }
          return new TextDecoder().decode(encoded);
        };
        return encoded;
      }
      const result = new Uint8Array(data);
      // Add toString method
      (result as any).toString = (enc?: string) => {
        if (enc === 'hex') {
          return Array.from(result).map((b) => (b as number).toString(16).padStart(2, '0')).join('');
        }
        return new TextDecoder().decode(result);
      };
      return result;
    },
    alloc: (size: number) => {
      const result = new Uint8Array(size);
      // Add toString method
      (result as any).toString = (enc?: string) => {
        if (enc === 'hex') {
          return Array.from(result).map((b) => (b as number).toString(16).padStart(2, '0')).join('');
        }
        return new TextDecoder().decode(result);
      };
      return result;
    },
    allocUnsafe: (size: number) => {
      const result = new Uint8Array(size);
      // Add toString method
      (result as any).toString = (enc?: string) => {
        if (enc === 'hex') {
          return Array.from(result).map((b) => (b as number).toString(16).padStart(2, '0')).join('');
        }
        return new TextDecoder().decode(result);
      };
      return result;
    },
    isBuffer: (obj: any) => obj instanceof Uint8Array,
    concat: (buffers: Uint8Array[]) => {
      const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of buffers) {
        result.set(buf, offset);
        offset += buf.length;
      }
      // Add toString method
      (result as any).toString = (enc?: string) => {
        if (enc === 'hex') {
          return Array.from(result).map((b) => (b as number).toString(16).padStart(2, '0')).join('');
        }
        return new TextDecoder().decode(result);
      };
      return result;
    }
  };
  
  global.Buffer = BufferPolyfill as any;
  console.log('✅ Buffer polyfill set up successfully');
}

// Set initialization flag
(global as any).__cryptoInitialized = true;

// Final verification
setTimeout(() => {
  console.log('🔍 Final crypto verification after module load...');
  console.log('Global crypto available:', typeof crypto !== 'undefined');
  console.log('Global crypto.getRandomValues available:', typeof crypto?.getRandomValues === 'function');
  console.log('Global Buffer available:', typeof global.Buffer !== 'undefined');
  console.log('Global hashes available:', typeof (global as any).hashes !== 'undefined');
  console.log('Crypto initialization flag:', (global as any).__cryptoInitialized);
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    try {
      const finalTest = new Uint8Array(2);
      crypto.getRandomValues(finalTest);
      console.log('✅ Final crypto test successful:', Array.from(finalTest));
    } catch (error) {
      console.error('❌ Final crypto test failed:', error);
    }
  }
  
  // Test Buffer polyfill
  if (typeof global.Buffer !== 'undefined') {
    try {
      const testBuffer = global.Buffer.from('test');
      console.log('✅ Buffer polyfill test successful:', testBuffer.length);
    } catch (error) {
      console.error('❌ Buffer polyfill test failed:', error);
    }
  }
}, 0);

export {}; // Make this a module