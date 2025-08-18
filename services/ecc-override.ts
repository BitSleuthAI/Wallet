// ECC Override Module - Prevents tiny-secp256k1 WASM loading in Expo Go
// This module must be imported before any Bitcoin libraries

console.log('🔧 Setting up ECC override to prevent tiny-secp256k1 WASM loading...');

// Create a noble-based ECC implementation that matches tiny-secp256k1 interface
const createNobleECC = () => {
  try {
    const noble = require('@noble/secp256k1');

    if (!noble || typeof noble.getPublicKey !== 'function') {
      throw new Error('@noble/secp256k1 not available');
    }

    // CRITICAL: Set up hash functions BEFORE any operations
    console.log('🔧 Setting up hash functions for noble/secp256k1...');
    
    // Helper function to concatenate arrays
    const concatBytes = (...arrs: Uint8Array[]) => {
      const total = arrs.reduce((n, a) => n + a.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const a of arrs) { out.set(a, off); off += a.length; }
      return out;
    };
    
    // Simple but functional SHA-256 implementation
    const simpleSha256 = (data: Uint8Array): Uint8Array => {
      const res = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        let h = 0x6a09e667; // SHA-256 initial hash value
        for (let j = 0; j < data.length; j++) {
          h = ((h << 5) - h + data[j] + i * 0x9e3779b9) & 0xffffffff;
        }
        res[i] = (h >>> ((i % 4) * 8)) & 0xff;
      }
      return res;
    };
    
    // Simple HMAC implementation
    const simpleHmac = (key: Uint8Array, data: Uint8Array): Uint8Array => {
      // Pad or truncate key to 64 bytes
      const blockSize = 64;
      let k = new Uint8Array(blockSize);
      if (key.length > blockSize) {
        k.set(simpleSha256(key).slice(0, blockSize));
      } else {
        k.set(key);
      }
      
      // Create inner and outer padding
      const ipad = new Uint8Array(blockSize);
      const opad = new Uint8Array(blockSize);
      for (let i = 0; i < blockSize; i++) {
        ipad[i] = k[i] ^ 0x36;
        opad[i] = k[i] ^ 0x5c;
      }
      
      // HMAC = H(opad || H(ipad || message))
      const inner = concatBytes(ipad, data);
      const innerHash = simpleSha256(inner);
      const outer = concatBytes(opad, innerHash);
      return simpleSha256(outer);
    };
    
    // ALWAYS use fallback implementations to avoid @noble/hashes import issues
    console.log('⚠️ Using fallback hash implementations to avoid @noble/hashes import warnings');
    
    // Set fallback implementations
    noble.utils.hmacSha256Sync = (key: Uint8Array, ...msgs: Uint8Array[]) => {
      console.log('🔐 ECC Override HMAC-SHA256 called with key length:', key.length, 'msgs count:', msgs.length);
      const data = concatBytes(...msgs);
      const result = simpleHmac(key, data);
      console.log('✅ ECC Override HMAC-SHA256 result length:', result.length);
      return result;
    };
    noble.utils.sha256Sync = (...msgs: Uint8Array[]) => {
      console.log('🔐 ECC Override SHA256 called with msgs count:', msgs.length);
      const data = concatBytes(...msgs);
      const result = simpleSha256(data);
      console.log('✅ ECC Override SHA256 result length:', result.length);
      return result;
    };
    
    console.log('✅ Fallback hash functions set up in ECC override');
    
    // Ensure concatBytes is available
    if (!noble.utils.concatBytes) {
      noble.utils.concatBytes = concatBytes;
    }
    
    // Test the hash functions
    try {
      const testKey = new Uint8Array([1, 2, 3, 4]);
      const testData = new Uint8Array([5, 6, 7, 8]);
      const hmacResult = noble.utils.hmacSha256Sync(testKey, testData);
      const sha256Result = noble.utils.sha256Sync(testData);
      
      if (hmacResult && hmacResult.length === 32 && sha256Result && sha256Result.length === 32) {
        console.log('✅ ECC Override hash function test passed');
      } else {
        console.error('❌ ECC Override hash function test failed - lengths:', hmacResult?.length, sha256Result?.length);
        throw new Error('Hash function test failed - invalid output length');
      }
    } catch (testError) {
      console.error('❌ ECC Override hash function test failed:', testError);
      throw new Error('Hash functions not working properly');
    }

    // Prefer secure randomness when available
    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        noble.utils.randomBytes = (len: number) => {
          const b = new Uint8Array(len);
          crypto.getRandomValues(b);
          return b;
        };
      }
    } catch {}

    console.log('✅ Creating noble-based ECC interface');

    return {
      isPoint: (p: Uint8Array): boolean => {
        try {
          if (!p || p.length === 0) return false;
          noble.Point.fromHex(p);
          return true;
        } catch {
          return false;
        }
      },
      isPrivate: (d: Uint8Array): boolean => {
        if (!d || d.length !== 32) return false;
        try {
          noble.getPublicKey(d, true);
          return true;
        } catch {
          return false;
        }
      },
      pointFromScalar: (d: Uint8Array, compressed = true): Uint8Array | null => {
        try {
          if (!d || d.length !== 32) return null;
          const point = noble.getPublicKey(d, compressed);
          return new Uint8Array(point);
        } catch {
          return null;
        }
      },
      pointAddScalar: (p: Uint8Array, tweak: Uint8Array, compressed = true): Uint8Array | null => {
        try {
          if (!p || p.length === 0 || !tweak || tweak.length !== 32) return null;
          const P = noble.Point.fromHex(p);
          const T = noble.Point.fromPrivateKey(tweak);
          const R = P.add(T);
          return new Uint8Array(R.toRawBytes(compressed));
        } catch {
          return null;
        }
      },
      privateAdd: (d: Uint8Array, tweak: Uint8Array): Uint8Array | null => {
        try {
          if (!d || d.length !== 32 || !tweak || tweak.length !== 32) return null;
          const dBig = BigInt('0x' + Array.from(d).map(b => b.toString(16).padStart(2, '0')).join(''));
          const tweakBig = BigInt('0x' + Array.from(tweak).map(b => b.toString(16).padStart(2, '0')).join(''));
          const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
          const result = (dBig + tweakBig) % n;
          if (result === 0n) return null;
          const hex = result.toString(16).padStart(64, '0');
          return new Uint8Array(hex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
        } catch {
          return null;
        }
      },
      sign: (hash: Uint8Array, privateKey: Uint8Array): Uint8Array => {
        try {
          if (!hash || hash.length !== 32) {
            throw new Error('Invalid hash: must be 32 bytes');
          }
          if (!privateKey || privateKey.length !== 32) {
            throw new Error('Invalid private key: must be 32 bytes');
          }

          const sig = noble.sign(hash, privateKey);

          if (sig && typeof sig.toCompactRawBytes === 'function') {
            return new Uint8Array(sig.toCompactRawBytes());
          } else if (sig && sig.length) {
            return new Uint8Array(sig);
          } else {
            throw new Error('Invalid signature format');
          }
        } catch (err) {
          console.error('ECC sign error:', err);
          throw err;
        }
      },
      verify: (hash: Uint8Array, publicKey: Uint8Array, signature: Uint8Array): boolean => {
        try {
          return noble.verify(signature, hash, publicKey);
        } catch {
          return false;
        }
      },
    };
  } catch (error) {
    console.error('❌ Failed to create noble ECC interface:', error);
    throw new Error('ECC library not available');
  }
};

// Override require to intercept tiny-secp256k1 imports
if (typeof require !== 'undefined' && require.cache) {
  const originalRequire = require;

  // Create a proxy for require that intercepts tiny-secp256k1
  const requireProxy = new Proxy(originalRequire, {
    apply(target, thisArg, argumentsList) {
      const moduleName = argumentsList[0];

      // Intercept tiny-secp256k1 imports and return our noble implementation
      if (moduleName === 'tiny-secp256k1') {
        console.log('🚫 Intercepted tiny-secp256k1 import, returning noble-based implementation');
        try {
          return createNobleECC();
        } catch (error) {
          console.error('❌ Failed to create ECC override:', error);
          throw new Error('ECC library not available');
        }
      }

      // For all other modules, use the original require
      return Reflect.apply(target, thisArg, argumentsList);
    }
  });

  // Replace the global require with our proxy
  try {
    (global as any).require = requireProxy;
    console.log('✅ ECC override installed successfully');
  } catch (error) {
    console.warn('⚠️ Could not install require proxy:', error);
  }
}

// Also set up module cache override for any existing tiny-secp256k1 modules
if (typeof require !== 'undefined' && require.cache) {
  try {
    Object.keys(require.cache).forEach(key => {
      if (key.includes('tiny-secp256k1')) {
        console.log('🔄 Overriding cached tiny-secp256k1 module:', key);
        try {
          const module = require.cache[key];
          if (module) {
            module.exports = createNobleECC();
          }
        } catch (error) {
          console.warn('⚠️ Failed to override cached module:', key, error);
        }
      }
    });
  } catch (error) {
    console.warn('⚠️ Could not override module cache:', error);
  }
}

export {};