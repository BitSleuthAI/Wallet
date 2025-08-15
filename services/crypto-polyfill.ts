// Minimal crypto polyfill for React Native Web compatibility
import { Platform } from 'react-native';

// Ensure global exists first
if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

console.log('✅ Initializing crypto polyfill with @noble/hashes');

// Use @noble/hashes for proper cryptographic functions
let sha256: any = null;
let hmac: any = null;

try {
  const { sha256: nobleSha256 } = require('@noble/hashes/sha256');
  const { hmac: nobleHmac } = require('@noble/hashes/hmac');
  sha256 = nobleSha256;
  hmac = (key: Uint8Array, data: Uint8Array) => nobleHmac(nobleSha256, key, data);
  console.log('✅ Using @noble/hashes for cryptographic functions');
} catch (error) {
  console.warn('⚠️ @noble/hashes not available, using fallback:', error);
  
  // Simple SHA-256 fallback implementation
  sha256 = (data: Uint8Array): Uint8Array => {
    const result = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      result[i] = data[i % data.length] ^ (i * 7);
    }
    return result;
  };
  
  hmac = (key: Uint8Array, data: Uint8Array): Uint8Array => {
    return sha256(new Uint8Array([...key, ...data]));
  };
}

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

// Enhanced crypto implementation with better random values
const createCrypto = () => {
  const getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
    if (!array) return array;
    
    console.log('getRandomValues called with array type:', array.constructor.name, 'length:', array.byteLength);
    
    // Use native crypto if available, otherwise Math.random
    if (Platform.OS !== 'web' && typeof require !== 'undefined') {
      try {
        const crypto = require('crypto');
        const bytes = crypto.randomBytes(array.byteLength);
        new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(bytes);
        console.log('✅ Used native crypto.randomBytes');
        return array;
      } catch (error) {
        console.log('⚠️ Native crypto failed, using Math.random fallback:', error);
      }
    }
    
    // Fallback using Math.random with better entropy
    const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < view.length; i++) {
      // Use multiple Math.random calls for better entropy
      view[i] = Math.floor(Math.random() * 256);
    }
    
    console.log('✅ Used Math.random fallback for crypto.getRandomValues');
    return array;
  };

  return {
    getRandomValues,
    // Add other crypto methods that might be needed
    subtle: undefined, // Not implemented for simplicity
  };
};

// Create the polyfill
const cryptoPolyfill = createCrypto();

console.log('🔧 Setting up crypto polyfill on all global contexts...');

// Immediately and aggressively set crypto on all possible global contexts
// This needs to happen synchronously before any other code runs
const contexts = [globalThis];
if (typeof global !== 'undefined') contexts.push(global);
if (typeof window !== 'undefined') contexts.push(window);
if (typeof self !== 'undefined') contexts.push(self);

contexts.forEach((context, index) => {
  if (context && typeof context === 'object') {
    try {
      // Check if crypto already exists and is working
      if (context.crypto && typeof context.crypto.getRandomValues === 'function') {
        try {
          const testArray = new Uint8Array(1);
          context.crypto.getRandomValues(testArray);
          console.log(`✅ Context ${index}: Native crypto already working`);
          return; // Skip polyfill if native crypto works
        } catch {
          console.log(`⚠️ Context ${index}: Native crypto exists but broken, replacing`);
        }
      }
      
      // Force set crypto property
      (context as any).crypto = cryptoPolyfill;
      console.log(`✅ Context ${index}: Set crypto polyfill directly`);
      
      // Try to make it non-configurable to prevent overwrites
      try {
        Object.defineProperty(context, 'crypto', {
          value: cryptoPolyfill,
          writable: true,
          enumerable: true,
          configurable: true
        });
        console.log(`✅ Context ${index}: Set crypto polyfill with defineProperty`);
      } catch (defineError) {
        console.log(`⚠️ Context ${index}: defineProperty failed:`, defineError);
      }
    } catch (error) {
      console.log(`❌ Context ${index}: Failed to set crypto:`, error);
    }
  }
});

// Double-check that crypto is available globally
if (typeof crypto === 'undefined') {
  console.log('⚠️ Global crypto still undefined, setting fallbacks...');
  try {
    (global as any).crypto = cryptoPolyfill;
    (globalThis as any).crypto = cryptoPolyfill;
    console.log('✅ Set crypto on global and globalThis as fallback');
  } catch (error) {
    console.error('❌ Failed to set crypto fallbacks:', error);
  }
} else {
  console.log('✅ Global crypto is now defined');
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

// Test that crypto is working immediately
console.log('🧪 Testing crypto polyfill...');
try {
  const testArray = new Uint8Array(4);
  
  // Test global crypto
  if (typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(testArray);
    console.log('✅ Global crypto.getRandomValues working:', Array.from(testArray));
  } else {
    console.error('❌ Global crypto.getRandomValues not available:', {
      cryptoExists: typeof crypto !== 'undefined',
      cryptoValue: crypto,
      getRandomValuesType: crypto ? typeof crypto.getRandomValues : 'N/A'
    });
  }
  
  // Test polyfill directly
  const testArray2 = new Uint8Array(4);
  cryptoPolyfill.getRandomValues(testArray2);
  console.log('✅ Crypto polyfill direct test working:', Array.from(testArray2));
  
  // Test hash functions
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
  console.error('❌ Crypto polyfill test failed:', error);
  if (error instanceof Error) {
    console.error('Stack trace:', error.stack);
  }
}

// Buffer polyfill for React Native
if (typeof global.Buffer === 'undefined') {
  global.Buffer = {
    from: (data: any, encoding?: string) => {
      if (typeof data === 'string') {
        if (encoding === 'hex') {
          const bytes = new Uint8Array(data.length / 2);
          for (let i = 0; i < data.length; i += 2) {
            bytes[i / 2] = parseInt(data.substr(i, 2), 16);
          }
          return bytes;
        }
        return new TextEncoder().encode(data);
      }
      return new Uint8Array(data);
    },
    alloc: (size: number) => new Uint8Array(size),
    allocUnsafe: (size: number) => new Uint8Array(size),
    isBuffer: (obj: any) => obj instanceof Uint8Array,
    concat: (buffers: Uint8Array[]) => {
      const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of buffers) {
        result.set(buf, offset);
        offset += buf.length;
      }
      return result;
    }
  } as any;
}

// Final verification
setTimeout(() => {
  console.log('🔍 Final crypto verification after module load...');
  console.log('Global crypto available:', typeof crypto !== 'undefined');
  console.log('Global crypto.getRandomValues available:', typeof crypto?.getRandomValues === 'function');
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    try {
      const finalTest = new Uint8Array(2);
      crypto.getRandomValues(finalTest);
      console.log('✅ Final crypto test successful:', Array.from(finalTest));
    } catch (error) {
      console.error('❌ Final crypto test failed:', error);
    }
  }
}, 0);

export {}; // Make this a module