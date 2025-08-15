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

const cryptoPolyfill = createCrypto();

// Immediately set up crypto in all possible global contexts
// Use try-catch to handle any potential errors
try {
  if (typeof globalThis !== 'undefined') {
    if (!globalThis.crypto) {
      (globalThis as any).crypto = cryptoPolyfill;
      console.log('Set crypto on globalThis');
    } else if (!globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues = cryptoPolyfill.getRandomValues;
      console.log('Set getRandomValues on globalThis.crypto');
    }
  }
} catch (error) {
  console.warn('Failed to set crypto on globalThis:', error);
}

try {
  if (typeof global !== 'undefined') {
    if (!(global as any).crypto) {
      (global as any).crypto = cryptoPolyfill;
      console.log('Set crypto on global');
    } else if (!(global as any).crypto.getRandomValues) {
      (global as any).crypto.getRandomValues = cryptoPolyfill.getRandomValues;
      console.log('Set getRandomValues on global.crypto');
    }
  }
} catch (error) {
  console.warn('Failed to set crypto on global:', error);
}

try {
  if (typeof window !== 'undefined') {
    if (!window.crypto) {
      (window as any).crypto = cryptoPolyfill;
      console.log('Set crypto on window');
    } else if (!window.crypto.getRandomValues) {
      window.crypto.getRandomValues = cryptoPolyfill.getRandomValues;
      console.log('Set getRandomValues on window.crypto');
    }
  }
} catch (error) {
  console.warn('Failed to set crypto on window:', error);
}

// Also ensure it's available on self for web workers
try {
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    if (!(self as any).crypto) {
      (self as any).crypto = cryptoPolyfill;
      console.log('Set crypto on self');
    } else if (!(self as any).crypto.getRandomValues) {
      (self as any).crypto.getRandomValues = cryptoPolyfill.getRandomValues;
      console.log('Set getRandomValues on self.crypto');
    }
  }
} catch (error) {
  console.warn('Failed to set crypto on self:', error);
}

// Test that crypto is available
try {
  const testArray = new Uint8Array(1);
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(testArray);
    console.log('✅ Crypto polyfill working on globalThis');
  } else if (typeof global !== 'undefined' && (global as any).crypto && (global as any).crypto.getRandomValues) {
    (global as any).crypto.getRandomValues(testArray);
    console.log('✅ Crypto polyfill working on global');
  } else if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(testArray);
    console.log('✅ Crypto polyfill working on window');
  } else {
    console.warn('⚠️ Crypto polyfill may not be working properly');
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