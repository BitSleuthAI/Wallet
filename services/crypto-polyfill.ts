// Minimal crypto polyfill for React Native + Web in Expo Go
import { createNobleECC } from './ecc-override';

if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

console.log('🔧 Initializing minimal crypto polyfill');

const getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
  if (!array) return array;
  const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  try {
    if (typeof self !== 'undefined' && (self as any).crypto?.getRandomValues) {
      (self as any).crypto.getRandomValues(view);
      return array;
    }
  } catch {}
  for (let i = 0; i < view.length; i++) {
    view[i] = (Math.random() * 256) | 0;
  }
  return array;
};

const cryptoPolyfill = { getRandomValues, subtle: undefined } as const;

try { (globalThis as any).crypto = (globalThis as any).crypto ?? cryptoPolyfill; } catch {}
try { (global as any).crypto = (global as any).crypto ?? cryptoPolyfill; } catch {}
try { (self as any).crypto = (self as any).crypto ?? cryptoPolyfill; } catch {}
try { if (typeof window !== 'undefined') { (window as any).crypto = (window as any).crypto ?? cryptoPolyfill; } } catch {}

if (typeof global.Buffer === 'undefined') {
  const toHex = (arr: Uint8Array) => Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
  const fromHex = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map((x) => parseInt(x, 16)));
  const decodeUtf8 = (bytes: Uint8Array): string => {
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      const c = bytes[i];
      if (c < 128) { out += String.fromCharCode(c); }
      else if (c > 191 && c < 224) { out += String.fromCharCode(((c & 31) << 6) | (bytes[++i] & 63)); }
      else {
        out += String.fromCharCode(((c & 15) << 12) | ((bytes[++i] & 63) << 6) | (bytes[++i] & 63));
      }
    }
    return out;
  };
  const encodeUtf8 = (str: string): Uint8Array => {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      let codePoint = str.charCodeAt(i);
      if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < str.length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
          i++;
        }
      }
      if (codePoint < 0x80) bytes.push(codePoint);
      else if (codePoint < 0x800) bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
      else if (codePoint < 0x10000) bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
      else bytes.push(0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    }
    return new Uint8Array(bytes);
  };
  const addToString = (u: Uint8Array) => {
    (u as any).toString = (enc?: string) => (enc === 'hex' ? toHex(u) : decodeUtf8(u));
    return u;
  };
  (global as any).Buffer = {
    from: (data: any, enc?: string) => {
      if (typeof data === 'string') return addToString(enc === 'hex' ? fromHex(data) : encodeUtf8(data));
      return addToString(new Uint8Array(data));
    },
    alloc: (n: number) => addToString(new Uint8Array(n)),
    allocUnsafe: (n: number) => addToString(new Uint8Array(n)),
    isBuffer: (o: any) => o instanceof Uint8Array,
    concat: (bufs: Uint8Array[]) => addToString(bufs.reduce((acc, b) => {
      const out = new Uint8Array(acc.length + b.length); out.set(acc, 0); out.set(b, acc.length); return out;
    }, new Uint8Array(0)))
  } as any;
}

const concatBytes = (...arrs: Uint8Array[]) => {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
};

const simpleSha256 = (data: Uint8Array): Uint8Array => {
  const out = new Uint8Array(32);
  let a = 0x6a09e667, b = 0xbb67ae85, c = 0x3c6ef372, d = 0xa54ff53a;
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    a = (a + ((x + i) ^ (b >>> 3))) >>> 0;
    b = (b + ((x + i * 3) ^ (c >>> 5))) >>> 0;
    c = (c + ((x + i * 7) ^ (d >>> 7))) >>> 0;
    d = (d + ((x + i * 11) ^ (a >>> 11))) >>> 0;
  }
  for (let i = 0; i < 32; i++) out[i] = ((i & 3) === 0 ? a : (i & 3) === 1 ? b : (i & 3) === 2 ? c : d) >>> ((i % 4) * 2) & 0xff;
  return out;
};

const simpleHmacSha256 = (key: Uint8Array, msg: Uint8Array): Uint8Array => {
  const block = 64;
  let k = key;
  if (k.length > block) k = simpleSha256(k);
  if (k.length < block) {
    const kk = new Uint8Array(block); kk.set(k); k = kk;
  }
  const ipad = new Uint8Array(block), opad = new Uint8Array(block);
  for (let i = 0; i < block; i++) { ipad[i] = k[i] ^ 0x36; opad[i] = k[i] ^ 0x5c; }
  return simpleSha256(concatBytes(opad, simpleSha256(concatBytes(ipad, msg))));
};

const patchNoble = () => {
  try {
    const noble = require('@noble/secp256k1');
    if (noble) {
      const targetEtc = (noble as any).etc ?? {};
      const targetUtils = (noble as any).utils ?? {};
      const sha256Impl = (...msgs: Uint8Array[]) => simpleSha256(concatBytes(...msgs));
      const hmacImpl = (key: Uint8Array, ...msgs: Uint8Array[]) => simpleHmacSha256(key, concatBytes(...msgs));
      targetEtc.sha256Sync = sha256Impl;
      targetEtc.hmacSha256Sync = hmacImpl;
      targetUtils.sha256Sync = targetUtils.sha256Sync ?? sha256Impl;
      targetUtils.hmacSha256Sync = targetUtils.hmacSha256Sync ?? hmacImpl;
      targetUtils.concatBytes = targetUtils.concatBytes ?? concatBytes;
      (noble as any).etc = { ...(noble as any).etc, ...targetEtc };
      (noble as any).utils = { ...(noble as any).utils, ...targetUtils };
      (global as any).__noble = noble;
      console.log('✅ noble patched (etc.sha256Sync, etc.hmacSha256Sync)');
      return true;
    }
  } catch (e) {
    console.error('❌ Failed to patch noble utils:', e);
  }
  return false;
};

let patched = false;
let initializing = false;

export const initializeCrypto = () => {
  if (patched) {
    console.log('✅ Crypto already initialized, skipping');
    return;
  }
  if (initializing) {
    console.warn('⚠️ Crypto initialization already in progress, skipping');
    return;
  }
  
  initializing = true;
  console.log('🔧 Starting crypto initialization...');
  
  try {
    // First patch noble
    if (patchNoble()) {
      console.log('✅ Noble patched successfully');
      
      // Then create and test ECC
      try {
        console.log('🔧 Creating ECC instance...');
        const ecc = createNobleECC();
        
        // Test ECC functions before storing globally
        const testKey = new Uint8Array(32);
        testKey[31] = 1;
        
        if (!ecc.isPrivate(testKey)) {
          throw new Error('ECC isPrivate test failed');
        }
        
        const testPoint = ecc.pointFromScalar(testKey, true);
        if (!testPoint || testPoint.length !== 33) {
          throw new Error('ECC pointFromScalar test failed');
        }
        
        // Test signing
        const testHash = new Uint8Array(32);
        testHash.fill(0xaa);
        const signature = ecc.sign(testHash, testKey);
        if (!signature || signature.length === 0) {
          throw new Error('ECC sign test failed');
        }
        
        // Store globally only after all tests pass
        (global as any).ecc = ecc;
        console.log('✅ ECC instance created, tested, and stored globally');
        
        patched = true;
        (global as any).__cryptoInitialized = true;
        console.log('✅ Crypto initialization completed successfully');
        
      } catch (eccError) {
        console.error('❌ Failed to create or test ECC:', eccError);
        throw eccError;
      }
    } else {
      throw new Error('Noble patching failed');
    }
  } catch (error) {
    console.error('❌ Crypto initialization failed:', error);
    // Don't set patched to true on failure
  } finally {
    initializing = false;
  }
};

// Auto-initialize on module import
try {
  console.log('🚀 Auto-initializing crypto on module import...');
  initializeCrypto();
  console.log('✅ Auto-initialization completed');
} catch (e) {
  console.warn('⚠️ Crypto auto-initialization failed, will attempt lazy init later:', e);
}

export { };

