// Crypto polyfill for React Native Web compatibility
// This must be imported before any crypto-dependent modules

// Ensure global exists first
if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

// Create a robust crypto implementation
const createCryptoPolyfill = () => {
  return {
    getRandomValues: (array: Uint8Array) => {
      // Try native crypto first (web browsers)
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        return window.crypto.getRandomValues(array);
      }
      // Try global crypto (Node.js style)
      if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
        return globalThis.crypto.getRandomValues(array);
      }
      // Fallback to Math.random
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  };
};

// Set up crypto polyfill on global immediately
if (typeof global.crypto === 'undefined') {
  global.crypto = createCryptoPolyfill() as any;
}

// Also ensure crypto is available on globalThis for web compatibility
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = global.crypto as any;
}

// For web environments, also set on window if available
if (typeof window !== 'undefined' && typeof window.crypto === 'undefined') {
  (window as any).crypto = global.crypto;
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