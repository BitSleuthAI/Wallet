// Crypto polyfill for React Native Web compatibility
// This must be imported before any crypto-dependent modules

// Ensure global exists first
if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

// Simple crypto implementation that avoids recursion
const simpleCrypto = {
  getRandomValues: (array: Uint8Array) => {
    // Use Math.random as fallback to avoid any potential recursion
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
};

// Only set up crypto if it doesn't exist to avoid conflicts
if (typeof global !== 'undefined' && !global.crypto) {
  global.crypto = simpleCrypto as any;
}

if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
  globalThis.crypto = simpleCrypto as any;
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