/**
 * Simplified Bitcoin Service - Only Essential Functions
 * Most functionality moved to esplora-service.ts and wallet-service.ts
 */

import { BitcoinPrice, UTXO } from '@/types/wallet';

// Don't initialize ECC at module load time - do it lazily when needed
let eccInitialized = false;

export const ensureECC = async () => {
  console.log('🔧 ensureECC called, eccInitialized:', eccInitialized);
  
  if (eccInitialized) {
    console.log('✅ ECC already initialized, returning');
    return;
  }
  
  try {
    console.log('🔧 Loading crypto-polyfill...');
    const { initializeCrypto } = require('./crypto-polyfill');
    
    console.log('🔧 Calling initializeCrypto...');
    const success = await initializeCrypto();
    
    console.log('🔧 initializeCrypto result:', success);
    
    if (!success) {
      throw new Error('Cryptographic library initialization failed');
    }
    
    console.log('🔧 Checking global ECC...');
    const ecc = (global as any).ecc;
    console.log('🔧 Global ECC:', typeof ecc, ecc ? Object.keys(ecc) : 'null');
    
    if (!ecc) {
      throw new Error('ECC library not available after initialization');
    }
    
    console.log('🔧 Loading bitcoinjs-lib...');
    try {
      // Try different import methods for React Native
      let bitcoin;
      try {
        bitcoin = require('bitcoinjs-lib');
      } catch (requireError) {
        console.log('⚠️ require() failed, trying dynamic import...');
        // For React Native, we might need to skip bitcoinjs-lib initialization
        // since it may not be fully compatible
        console.log('⚠️ Skipping bitcoinjs-lib initialization in React Native');
        eccInitialized = true;
        console.log('✅ ensureECC completed successfully (without bitcoinjs-lib)');
        return;
      }
      
      console.log('🔧 BitcoinJS loaded successfully');
      
      // Initialize BitcoinJS with our ECC implementation
      console.log('🔧 Initializing BitcoinJS with ECC...');
      bitcoin.initEccLib(ecc);
      
      console.log('✅ BitcoinJS initialized with ECC');
    } catch (bitcoinError) {
      console.warn('⚠️ BitcoinJS initialization failed, continuing without it:', bitcoinError);
      // Don't throw here - we can still use ECC for other purposes
    }
    
    eccInitialized = true;
    console.log('✅ ensureECC completed successfully');
  } catch (error) {
    console.error('❌ ensureECC failed:', error);
    throw error;
  }
};

/**
 * Validate Bitcoin address format
 */
export const isValidBitcoinAddress = (address: string): boolean => {
  try {
    // Basic validation for bech32 addresses (P2WPKH)
    if (address.startsWith('bc1q') && address.length === 42) {
      return true;
    }
    
    // Basic validation for legacy addresses (P2PKH)
    if (address.startsWith('1') && address.length >= 26 && address.length <= 35) {
      return true;
    }
    
    // Basic validation for P2SH addresses
    if (address.startsWith('3') && address.length >= 26 && address.length <= 35) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Address validation failed:', error);
    return false;
  }
};

/**
 * Get UTXOs for an address (still needed by coin-control and send screens)
 */
export const getAddressUTXOs = async (address: string): Promise<UTXO[]> => {
  try {
    console.log('🔍 Fetching UTXOs for address:', address.substring(0, 10) + '...');
    
    // Use XMLHttpRequest to avoid polyfill issues
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.timeout = 15000;
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log('✅ UTXOs fetched:', data.length);
              
              const utxos: UTXO[] = data.map((utxo: any) => ({
                txid: utxo.txid,
                vout: utxo.vout,
                value: utxo.value,
                scriptPubKey: utxo.scriptpubkey,
                address: utxo.status?.confirmed ? address : undefined,
              }));
              
              resolve(utxos);
            } catch (parseError) {
              console.error('❌ Failed to parse UTXO response:', parseError);
              reject(new Error('Failed to parse UTXO data'));
            }
          } else {
            console.error('❌ UTXO fetch failed with status:', xhr.status);
            reject(new Error(`UTXO fetch failed: ${xhr.status}`));
          }
        }
      };
      
      xhr.onerror = () => {
        console.error('❌ UTXO fetch network error');
        reject(new Error('Network error'));
      };
      
      xhr.ontimeout = () => {
        console.error('❌ UTXO fetch timeout');
        reject(new Error('Request timeout'));
      };
      
      // Try Blockstream first, then Mempool.space
      const urls = [
        `https://blockstream.info/api/address/${address}/utxo`,
        `https://mempool.space/api/address/${address}/utxo`
      ];
      
      let urlIndex = 0;
      
      const tryNextUrl = () => {
        if (urlIndex >= urls.length) {
          reject(new Error('All UTXO endpoints failed'));
          return;
        }
        
        console.log('🔍 Trying UTXO URL:', urls[urlIndex]);
        xhr.open('GET', urls[urlIndex], true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.send();
      };
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log('✅ UTXOs fetched:', data.length);
              
              const utxos: UTXO[] = data.map((utxo: any) => ({
                txid: utxo.txid,
                vout: utxo.vout,
                value: utxo.value,
                scriptPubKey: utxo.scriptpubkey,
                address: utxo.status?.confirmed ? address : undefined,
              }));
              
              resolve(utxos);
            } catch (parseError) {
              console.error('❌ Failed to parse UTXO response:', parseError);
              reject(new Error('Failed to parse UTXO data'));
            }
          } else if (xhr.status >= 500 || xhr.status === 0) {
            // Server error or network issue, try next URL
            console.warn('⚠️ UTXO endpoint failed, trying next...');
            urlIndex++;
            setTimeout(tryNextUrl, 1000);
          } else {
            // Client error (4xx), don't retry
            console.error('❌ UTXO fetch failed with status:', xhr.status);
            reject(new Error(`UTXO fetch failed: ${xhr.status}`));
          }
        }
      };
      
      tryNextUrl();
    });
  } catch (error) {
    console.error('❌ getAddressUTXOs failed:', error);
    throw error;
  }
};

/**
 * Get Bitcoin price (fallback for send screen)
 */
export const getBitcoinPrice = async (): Promise<BitcoinPrice> => {
  try {
    console.log('💲 Fetching Bitcoin price...');
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.timeout = 10000;
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log('✅ Bitcoin price fetched:', data.USD.last);
              
              resolve({
                USD: { last: data.USD.last },
                EUR: { last: data.EUR?.last || data.USD.last * 0.85 },
                GBP: { last: data.GBP?.last || data.USD.last * 0.73 },
              });
            } catch (parseError) {
              console.error('❌ Failed to parse price response:', parseError);
              reject(new Error('Failed to parse price data'));
            }
          } else {
            console.error('❌ Price fetch failed with status:', xhr.status);
            reject(new Error(`Price fetch failed: ${xhr.status}`));
          }
        }
      };
      
      xhr.onerror = () => {
        console.error('❌ Price fetch network error');
        reject(new Error('Network error'));
      };
      
      xhr.ontimeout = () => {
        console.error('❌ Price fetch timeout');
        reject(new Error('Request timeout'));
      };
      
      xhr.open('GET', 'https://blockchain.info/ticker', true);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();
    });
  } catch (error) {
    console.error('❌ getBitcoinPrice failed:', error);
    throw error;
  }
};

/**
 * Send transaction (still needed by send screen)
 */
export const sendTransaction = async (
  fromAddress: string,
  toAddress: string,
  amount: number,
  feeRate: number = 10
): Promise<string> => {
  try {
    console.log('📤 Sending transaction...');
    console.log('From:', fromAddress.substring(0, 10) + '...');
    console.log('To:', toAddress.substring(0, 10) + '...');
    console.log('Amount:', amount, 'BTC');
    console.log('Fee rate:', feeRate, 'sat/vB');
    
    // This is a placeholder implementation
    // In a real implementation, you would:
    // 1. Get UTXOs for the from address
    // 2. Create a transaction with proper inputs/outputs
    // 3. Sign the transaction with the private key
    // 4. Broadcast the transaction
    
    throw new Error('Transaction sending not yet implemented');
  } catch (error) {
    console.error('❌ sendTransaction failed:', error);
    throw error;
  }
};
