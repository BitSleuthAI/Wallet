import { Transaction, UTXO, BitcoinPrice } from '@/types/wallet';

const BLOCKSTREAM_API = 'https://blockstream.info/api';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export const getBitcoinPrice = async (): Promise<BitcoinPrice> => {
  try {
    const response = await fetch(`${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`);
    const data = await response.json();
    
    return {
      usd: data.bitcoin.usd,
      usd_24h_change: data.bitcoin.usd_24h_change,
    };
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);
    throw new Error('Failed to fetch Bitcoin price');
  }
};

export const getAddressBalance = async (address: string): Promise<number> => {
  try {
    const response = await fetch(`${BLOCKSTREAM_API}/address/${address}`);
    const data = await response.json();
    
    // Convert from satoshis to BTC
    return (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000;
  } catch (error) {
    console.error('Error fetching address balance:', error);
    return 0;
  }
};

export const getWalletBalance = async (addresses: string[]): Promise<number> => {
  try {
    const balancePromises = addresses.map(address => getAddressBalance(address));
    const balances = await Promise.all(balancePromises);
    return balances.reduce((total, balance) => total + balance, 0);
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return 0;
  }
};

export const getAddressTransactions = async (address: string): Promise<any[]> => {
  try {
    const response = await fetch(`${BLOCKSTREAM_API}/address/${address}/txs`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching address transactions:', error);
    return [];
  }
};

export const getTransactionHistory = async (addresses: string[]): Promise<Transaction[]> => {
  try {
    const transactionPromises = addresses.map(address => getAddressTransactions(address));
    const addressTransactions = await Promise.all(transactionPromises);
    
    const allTransactions = addressTransactions.flat();
    const uniqueTransactions = new Map();
    
    // Remove duplicates and process transactions
    allTransactions.forEach(tx => {
      if (!uniqueTransactions.has(tx.txid)) {
        const isReceived = tx.vout.some((output: any) => 
          addresses.includes(output.scriptpubkey_address)
        );
        
        const amount = isReceived 
          ? tx.vout.reduce((sum: number, output: any) => 
              addresses.includes(output.scriptpubkey_address) ? sum + output.value : sum, 0) / 100000000
          : tx.vin.reduce((sum: number, input: any) => 
              addresses.includes(input.prevout?.scriptpubkey_address) ? sum + input.prevout.value : sum, 0) / 100000000;
        
        const transaction: Transaction = {
          txid: tx.txid,
          type: isReceived ? 'received' : 'sent',
          amount: Math.abs(amount),
          amountUSD: 0, // Will be calculated with current price
          address: isReceived 
            ? tx.vout.find((output: any) => addresses.includes(output.scriptpubkey_address))?.scriptpubkey_address || ''
            : tx.vin.find((input: any) => addresses.includes(input.prevout?.scriptpubkey_address))?.prevout?.scriptpubkey_address || '',
          timestamp: tx.status.block_time * 1000,
          confirmations: tx.status.confirmed ? 6 : 0,
          status: tx.status.confirmed ? 'confirmed' : 'pending',
        };
        
        uniqueTransactions.set(tx.txid, transaction);
      }
    });
    
    return Array.from(uniqueTransactions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50); // Limit to 50 most recent transactions
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
};

export const getAddressUTXOs = async (address: string): Promise<UTXO[]> => {
  try {
    const response = await fetch(`${BLOCKSTREAM_API}/address/${address}/utxo`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching UTXOs:', error);
    return [];
  }
};

export const broadcastTransaction = async (txHex: string): Promise<string> => {
  try {
    const response = await fetch(`${BLOCKSTREAM_API}/tx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: txHex,
    });
    
    if (!response.ok) {
      throw new Error('Failed to broadcast transaction');
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error broadcasting transaction:', error);
    throw new Error('Failed to broadcast transaction');
  }
};