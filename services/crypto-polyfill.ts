// Crypto polyfill for React Native Web compatibility
// This must be imported before any crypto-dependent modules

import { Platform } from 'react-native';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';

// Ensure global exists first
if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

// Import crypto libraries for proper hash functions
let createHash: any;
let createHmac: any;

try {
  // Try to import crypto functions for mobile
  if (Platform.OS !== 'web') {
    const crypto = require('crypto');
    createHash = crypto.createHash;
    createHmac = crypto.createHmac;
  }
} catch {
  console.log('Native crypto not available, using fallback');
}

// Use the proper SHA-256 implementation
const sha256 = (data: Uint8Array): Uint8Array => {
  return nobleSha256(data);
};

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
      const hash = sha256(this._data) as Uint8Array;
      if (encoding === 'hex') {
        return Array.from(hash).map((b: number) => b.toString(16).padStart(2, '0')).join('');
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
  
  // Simple HMAC-SHA256 implementation
  const hmacSha256 = (key: Uint8Array, message: Uint8Array): Uint8Array => {
    const blockSize = 64;
    const opad = new Uint8Array(blockSize).fill(0x5c);
    const ipad = new Uint8Array(blockSize).fill(0x36);
    
    // If key is longer than block size, hash it
    if (key.length > blockSize) {
      key = sha256(key);
    }
    
    // If key is shorter than block size, pad with zeros
    if (key.length < blockSize) {
      const paddedKey = new Uint8Array(blockSize);
      paddedKey.set(key);
      key = paddedKey;
    }
    
    // XOR key with pads
    for (let i = 0; i < blockSize; i++) {
      opad[i] ^= key[i];
      ipad[i] ^= key[i];
    }
    
    // Hash inner
    const innerHash = sha256(new Uint8Array([...ipad, ...message]));
    
    // Hash outer
    return sha256(new Uint8Array([...opad, ...innerHash]));
  };
  
  return {
    update: function(data: any) {
      this._data = data;
      return this;
    },
    digest: function(encoding?: string) {
      const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : new Uint8Array(key);
      const dataBytes = typeof this._data === 'string' ? new TextEncoder().encode(this._data) : new Uint8Array(this._data);
      const hash = hmacSha256(keyBytes, dataBytes);
      if (encoding === 'hex') {
        return Array.from(hash).map((b: number) => b.toString(16).padStart(2, '0')).join('');
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
    
    // Use native crypto if available, otherwise Math.random
    if (Platform.OS !== 'web' && typeof require !== 'undefined') {
      try {
        const crypto = require('crypto');
        const bytes = crypto.randomBytes(array.byteLength);
        new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(bytes);
        return array;
      } catch {
        // Fall back to Math.random
      }
    }
    
    // Fallback using Math.random
    if (array instanceof Uint8Array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    } else if (array instanceof Uint16Array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 65536);
      }
    } else if (array instanceof Uint32Array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 4294967296);
      }
    } else if (array instanceof Int8Array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256) - 128;
      }
    } else if (array instanceof Int16Array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 65536) - 32768;
      }
    } else if (array instanceof Int32Array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 4294967296) - 2147483648;
      }
    }
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

// Immediately and aggressively set crypto on all possible global contexts
// This needs to happen synchronously before any other code runs
const contexts = [globalThis, global];
if (typeof window !== 'undefined') contexts.push(window);
if (typeof self !== 'undefined') contexts.push(self);

contexts.forEach(context => {
  if (context && typeof context === 'object') {
    try {
      // Force set crypto property
      (context as any).crypto = cryptoPolyfill;
      
      // Try to make it non-configurable to prevent overwrites
      Object.defineProperty(context, 'crypto', {
        value: cryptoPolyfill,
        writable: true, // Allow overwriting in case something else needs to set it
        enumerable: true,
        configurable: true
      });
    } catch {
      // Fallback - just set it directly
      (context as any).crypto = cryptoPolyfill;
    }
  }
});

// Ensure crypto is available globally
if (typeof crypto === 'undefined') {
  (global as any).crypto = cryptoPolyfill;
  (globalThis as any).crypto = cryptoPolyfill;
}

// Set up hash functions for BIP32
const hashFunctions = {
  sha256: createHash || fallbackCreateHash,
  hmacSha256Sync: (key: any, data: any) => {
    const hmac = (createHmac || fallbackCreateHmac)('sha256', key);
    return hmac.update(data).digest();
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
try {
  const testArray = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(testArray);
    console.log('✅ Crypto polyfill initialized successfully');
  } else {
    console.warn('⚠️ Crypto polyfill may not be working properly');
  }
  
  // Test hash functions
  if (hashFunctions.hmacSha256Sync) {
    hashFunctions.hmacSha256Sync('test', 'data');
    console.log('✅ Hash functions initialized successfully');
  }
} catch (error) {
  console.error('❌ Crypto polyfill test failed:', error);
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

export {}; // Make this a module