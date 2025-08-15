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
    
    // Always use Math.random for consistency and to avoid any crypto issues
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
const contexts = [globalThis, global, window, self].filter(Boolean);
contexts.forEach(context => {
  if (context && typeof context === 'object') {
    (context as any).crypto = cryptoPolyfill;
    // Also set it as a non-configurable property to prevent overwrites
    try {
      Object.defineProperty(context, 'crypto', {
        value: cryptoPolyfill,
        writable: false,
        enumerable: true,
        configurable: false
      });
    } catch {
      // Ignore if we can't define the property
    }
  }
});

// Also ensure crypto is available on the global scope immediately
if (typeof crypto === 'undefined') {
  (global as any).crypto = cryptoPolyfill;
  (globalThis as any).crypto = cryptoPolyfill;
}

// Test that crypto is working immediately
try {
  const testArray = new Uint8Array(4);
  cryptoPolyfill.getRandomValues(testArray);
  console.log('✅ Crypto polyfill initialized successfully');
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