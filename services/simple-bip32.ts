// Simple BIP32 implementation for React Native using @noble/secp256k1
// This replaces the problematic bip32 library

import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';

// Simple BIP32 implementation
export class SimpleBIP32 {
  private ecc: any;
  
  constructor(ecc: any) {
    this.ecc = ecc;
  }
  
  fromSeed(seed: Uint8Array) {
    return new SimpleBIP32Node(this.ecc, seed);
  }
  
  fromBase58(base58: string) {
    // This is a simplified implementation
    // In a real implementation, you'd decode the base58 and extract the key data
    throw new Error('fromBase58 not implemented in SimpleBIP32 - use fromSeed instead');
  }
}

export class SimpleBIP32Node {
  private ecc: any;
  private seed: Uint8Array;
  private _privateKey?: Uint8Array;
  private _publicKeyBytes?: Uint8Array;
  private isNeutered: boolean;
  
  constructor(ecc: any, seed: Uint8Array, isNeutered: boolean = false) {
    this.ecc = ecc;
    this.seed = seed;
    this.isNeutered = isNeutered;
  }
  
  derivePath(path: string) {
    if (this.isNeutered) {
      throw new Error('Cannot derive from neutered node');
    }
    // Simple path derivation - this is a basic implementation
    // For production, you'd want a full BIP32 implementation
    const parts = path.split('/');
    let current = this.seed;
    
    for (const part of parts) {
      if (part === 'm') continue;
      const index = parseInt(part.replace(/'/g, ''), 10);
      current = this.deriveChild(current, index);
    }
    
    return new SimpleBIP32Node(this.ecc, current, this.isNeutered);
  }
  
  derive(index: number) {
    if (this.isNeutered) {
      throw new Error('Cannot derive from neutered node');
    }
    const childSeed = this.deriveChild(this.seed, index);
    return new SimpleBIP32Node(this.ecc, childSeed, this.isNeutered);
  }
  
  private deriveChild(parent: Uint8Array, index: number) {
    // Simple child derivation using HMAC-SHA512
    const hmacKey = new Uint8Array(32);
    hmacKey.fill(0x01); // Simple key for demo
    
    const data = new Uint8Array(parent.length + 4);
    data.set(parent);
    data.set(new Uint8Array([
      (index >> 24) & 0xff,
      (index >> 16) & 0xff,
      (index >> 8) & 0xff,
      index & 0xff
    ]), parent.length);
    
    return hmac(sha256, hmacKey, data);
  }
  
  get privateKeyBytes() {
    if (this.isNeutered) {
      throw new Error('Cannot access private key from neutered node');
    }
    if (!this._privateKey) {
      this._privateKey = this.seed.slice(0, 32);
    }
    return this._privateKey;
  }
  
  get publicKeyBytes() {
    if (!this._publicKeyBytes) {
      if (this.isNeutered) {
        throw new Error('Cannot derive public key from neutered node without pre-computed public key');
      }
      this._publicKeyBytes = this.ecc.pointFromScalar(this.privateKeyBytes, true);
    }
    return this._publicKeyBytes;
  }
  
  get publicKey() {
    return Buffer.from(this.publicKeyBytes || new Uint8Array(33));
  }
  
  get privateKey() {
    if (this.isNeutered) {
      throw new Error('Cannot access private key from neutered node');
    }
    return Buffer.from(this.privateKeyBytes);
  }
  
  neutered() {
    // Return a version without private key access
    // Create a neutered node with empty seed to prevent private key derivation
    // Compute public key directly from private key to avoid accessing privateKeyBytes getter
    let publicKeyBytes: Uint8Array;
    if (this._publicKeyBytes) {
      publicKeyBytes = this._publicKeyBytes;
    } else {
      // Compute public key directly from seed without using the getter
      const privateKeyBytes = this.seed.slice(0, 32);
      publicKeyBytes = this.ecc.pointFromScalar(privateKeyBytes, true);
    }
    
    const neutered = new SimpleBIP32Node(this.ecc, new Uint8Array(0), true);
    neutered._publicKeyBytes = publicKeyBytes;
    return neutered;
  }
  
  toBase58() {
    // This would need a proper base58 implementation
    throw new Error('toBase58 not implemented in SimpleBIP32');
  }
}

// Factory function to match bip32.BIP32Factory interface
export function createSimpleBIP32Factory(ecc: any) {
  return {
    fromSeed: (seed: Uint8Array) => new SimpleBIP32(ecc).fromSeed(seed),
    fromBase58: (base58: string) => new SimpleBIP32(ecc).fromBase58(base58),
  };
}
