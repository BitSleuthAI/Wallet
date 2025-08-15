// Crypto polyfill for React Native Web compatibility
// This must be imported before any crypto-dependent modules

// Ensure global exists first
if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

// Enhanced crypto implementation with better random values
const createCrypto = () => {
  const getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
    if (!array) return array;
    
    // Try to use native crypto first
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      try {
        return window.crypto.getRandomValues(array);
      } catch (error) {
        console.warn('Native crypto failed, using fallback:', error);
      }
    }
    
    // Fallback to Math.random
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

// Force set crypto on all global contexts immediately
const setupCrypto = () => {
  // Set on globalThis
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).crypto = cryptoPolyfill;
  }
  
  // Set on global
  if (typeof global !== 'undefined') {
    (global as any).crypto = cryptoPolyfill;
  }
  
  // Set on window
  if (typeof window !== 'undefined') {
    (window as any).crypto = cryptoPolyfill;
  }
  
  // Set on self
  if (typeof self !== 'undefined') {
    (self as any).crypto = cryptoPolyfill;
  }
};

// Setup crypto immediately
setupCrypto();

// Test that crypto is working
const testCrypto = () => {
  try {
    const testArray = new Uint8Array(4);
    cryptoPolyfill.getRandomValues(testArray);
    console.log('✅ Crypto polyfill initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Crypto polyfill test failed:', error);
    return false;
  }
};

// Test immediately
testCrypto();

// Also test after a short delay to ensure it's available
setTimeout(() => {
  testCrypto();
}, 100);

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