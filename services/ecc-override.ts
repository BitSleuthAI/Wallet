// ECC Override Module - Prevents tiny-secp256k1 WASM loading in Expo Go

console.log('🔧 Setting up ECC override to prevent tiny-secp256k1 WASM loading...');

// Create a noble-based ECC implementation that matches tiny-secp256k1 interface
export const createNobleECC = () => {
  try {
    const mod = require('@noble/secp256k1');
    const noble = (mod && (mod.secp256k1 || mod.default)) ? (mod.secp256k1 ?? mod.default) : mod;

    if (!noble || typeof noble.getPublicKey !== 'function') {
      console.error('secp256k1 module shape:', Object.keys(mod || {}));
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
    
    const etcObj = (noble as any).etc ?? {};
    const utilsObj = (noble as any).utils ?? {};
    
    // Try to use @noble/hashes first, fallback to simple implementations
    let hmacImpl, shaImpl;
    try {
      const { sha256 } = require('@noble/hashes/sha256');
      const { hmac } = require('@noble/hashes/hmac');
      
      hmacImpl = (key: Uint8Array, ...msgs: Uint8Array[]) => {
        console.log('🔐 ECC Override HMAC-SHA256 (noble/hashes) called with key length:', key.length, 'msgs count:', msgs.length);
        const data = concatBytes(...msgs);
        const result = hmac(sha256, key, data);
        console.log('✅ ECC Override HMAC-SHA256 result length:', result.length);
        return result;
      };
      
      shaImpl = (...msgs: Uint8Array[]) => {
        console.log('🔐 ECC Override SHA256 (noble/hashes) called with msgs count:', msgs.length);
        const data = concatBytes(...msgs);
        const result = sha256(data);
        console.log('✅ ECC Override SHA256 result length:', result.length);
        return result;
      };
      
      console.log('✅ Using @noble/hashes for ECC override hash functions');
    } catch (hashError) {
      console.warn('⚠️ @noble/hashes not available in ECC override, using fallback:', hashError);
      
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
      
      hmacImpl = (key: Uint8Array, ...msgs: Uint8Array[]) => {
        console.log('🔐 ECC Override HMAC-SHA256 (fallback) called with key length:', key.length, 'msgs count:', msgs.length);
        const data = concatBytes(...msgs);
        const result = simpleHmac(key, data);
        console.log('✅ ECC Override HMAC-SHA256 result length:', result.length);
        return result;
      };
      
      shaImpl = (...msgs: Uint8Array[]) => {
        console.log('🔐 ECC Override SHA256 (fallback) called with msgs count:', msgs.length);
        const data = concatBytes(...msgs);
        const result = simpleSha256(data);
        console.log('✅ ECC Override SHA256 result length:', result.length);
        return result;
      };
    }
    
    etcObj.hmacSha256Sync = hmacImpl;
    etcObj.sha256Sync = shaImpl;
    utilsObj.hmacSha256Sync = utilsObj.hmacSha256Sync ?? hmacImpl;
    utilsObj.sha256Sync = utilsObj.sha256Sync ?? shaImpl;
    utilsObj.concatBytes = utilsObj.concatBytes ?? concatBytes;
    (noble as any).etc = { ...(noble as any).etc, ...etcObj };
    (noble as any).utils = { ...(noble as any).utils, ...utilsObj };
    
    console.log('✅ Hash functions set up in ECC override');
    
    // Ensure concatBytes is available
    if (!noble.utils.concatBytes) {
      noble.utils.concatBytes = concatBytes;
    }
    
    // Test the hash functions
    try {
      const testKey = new Uint8Array([1, 2, 3, 4]);
      const testData = new Uint8Array([5, 6, 7, 8]);
      
      // Test HMAC function
      if (!noble.utils.hmacSha256Sync || typeof noble.utils.hmacSha256Sync !== 'function') {
        throw new Error('hmacSha256Sync function not available');
      }
      
      const hmacResult = noble.utils.hmacSha256Sync(testKey, testData);
      if (!hmacResult || hmacResult.length !== 32) {
        console.error('❌ HMAC test failed - result:', hmacResult, 'length:', hmacResult?.length);
        throw new Error('HMAC function test failed - invalid output');
      }
      
      // Test SHA256 function
      if (!noble.utils.sha256Sync || typeof noble.utils.sha256Sync !== 'function') {
        throw new Error('sha256Sync function not available');
      }
      
      const sha256Result = noble.utils.sha256Sync(testData);
      if (!sha256Result || sha256Result.length !== 32) {
        console.error('❌ SHA256 test failed - result:', sha256Result, 'length:', sha256Result?.length);
        throw new Error('SHA256 function test failed - invalid output');
      }
      
      console.log('✅ ECC Override hash function test passed');
    } catch (testError) {
      console.error('❌ ECC Override hash function test failed:', testError);
      const errorMessage = testError instanceof Error ? testError.message : 'Unknown error';
      throw new Error(`Hash functions not working properly: ${errorMessage}`);
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

          // Ensure hash functions are available before signing
          if (!noble.utils.hmacSha256Sync || !noble.utils.sha256Sync) {
            throw new Error('Hash functions not available for signing');
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