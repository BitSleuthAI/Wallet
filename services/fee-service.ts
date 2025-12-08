// Fee estimation and transaction utilities
import { FeeEstimate, UTXO } from '@/types/wallet';
import { Platform } from 'react-native';

// API endpoints for fee estimation
const BLOCKSTREAM_API = 'https://blockstream.info/api';
const MEMPOOL_RECOMMENDED_API = 'https://mempool.space/api/v1/fees/recommended';
const MEMPOOL_ESTIMATES_API = 'https://mempool.space/api/v1/fees/mempool-blocks';

// Rate limiting for fee API calls (250ms as per Blockstream docs)
const FEE_API_DELAY_MS = 250;
let lastFeeApiCallTime = 0;

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  // Enforce minimum delay between fee API calls
  const now = Date.now();
  const timeSinceLastCall = now - lastFeeApiCallTime;
  if (timeSinceLastCall < FEE_API_DELAY_MS) {
    const delayNeeded = FEE_API_DELAY_MS - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, delayNeeded));
  }
  
  lastFeeApiCallTime = Date.now();
  return fetch(url, options);
}

// Fee estimation service
export class FeeEstimationService {
  private static instance: FeeEstimationService;
  private cachedFees: FeeEstimate | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute

  static getInstance(): FeeEstimationService {
    if (!FeeEstimationService.instance) {
      FeeEstimationService.instance = new FeeEstimationService();
    }
    return FeeEstimationService.instance;
  }

  async getFeeEstimates(): Promise<FeeEstimate> {
    const now = Date.now();
    
    // Return cached fees if still valid
    if (this.cachedFees && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.cachedFees;
    }

    // Try multiple sources for fee estimation
    const feeEstimate = await this.fetchFromMultipleSources();
    
    this.cachedFees = feeEstimate;
    this.lastFetchTime = now;
    
    console.log('✅ Dynamic fee estimates fetched:', feeEstimate);
    return feeEstimate;
  }

  private async fetchFromMultipleSources(): Promise<FeeEstimate> {
    const sources = [
      () => this.fetchFromMempoolRecommended(),
      () => this.fetchFromMempoolEstimates(), 
      () => this.fetchFromBlockstream(),
    ];

    for (const fetchSource of sources) {
      try {
        const result = await fetchSource();
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn('Fee source failed, trying next:', error);
        continue;
      }
    }

    // All sources failed, return fallback
    console.warn('❌ All fee estimation sources failed, using fallback rates');
    return this.getFallbackFees();
  }

  private async fetchFromMempoolRecommended(): Promise<FeeEstimate | null> {
    try {
      console.log('📊 Fetching recommended fees from Mempool.space...');
      
      const response = await rateLimitedFetch(MEMPOOL_RECOMMENDED_API, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BitcoinWallet/1.0',
        },
        ...(Platform.OS === 'web' ? { 
          mode: 'cors' as const,
          credentials: 'omit' as const,
        } : {}),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Mempool.space recommended API returns: { fastestFee, halfHourFee, hourFee, economyFee, minimumFee }
      const feeEstimate: FeeEstimate = {
        fastestFee: Math.ceil(data.fastestFee || 20),
        halfHourFee: Math.ceil(data.halfHourFee || 15), 
        hourFee: Math.ceil(data.hourFee || 10),
        economyFee: Math.ceil(data.economyFee || 5),
        minimumFee: Math.ceil(data.minimumFee || 1),
      };

      console.log('✅ Mempool.space recommended fees:', feeEstimate);
      return feeEstimate;
    } catch (error) {
      console.warn('❌ Failed to fetch from Mempool.space recommended:', error);
      return null;
    }
  }

  private async fetchFromMempoolEstimates(): Promise<FeeEstimate | null> {
    try {
      console.log('📊 Fetching mempool block estimates from Mempool.space...');
      
      const response = await rateLimitedFetch(MEMPOOL_ESTIMATES_API, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BitcoinWallet/1.0',
        },
        ...(Platform.OS === 'web' ? { 
          mode: 'cors' as const,
          credentials: 'omit' as const,
        } : {}),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blocks = await response.json();
      
      if (!Array.isArray(blocks) || blocks.length === 0) {
        throw new Error('Invalid mempool blocks data');
      }

      // Calculate fee estimates based on mempool blocks
      // blocks[0] = next block, blocks[1] = second block, etc.
      const nextBlockFee = blocks[0]?.medianFee || 20;
      const secondBlockFee = blocks[1]?.medianFee || 15;
      const thirdBlockFee = blocks[2]?.medianFee || 10;
      
      // Calculate average fees for different time horizons
      const fastestFee = Math.ceil(nextBlockFee * 1.1); // 10% premium for fastest
      const halfHourFee = Math.ceil((nextBlockFee + secondBlockFee) / 2);
      const hourFee = Math.ceil((nextBlockFee + secondBlockFee + thirdBlockFee) / 3);

      // Keep economy fees responsive to congestion without hard-capping
      const adjustedHourFee = Math.max(hourFee, thirdBlockFee);
      const economyTarget = Math.max(thirdBlockFee, adjustedHourFee * 0.75);
      const economyFee = Math.max(
        1,
        Math.min(Math.ceil(economyTarget), halfHourFee)
      );
      const minimumFee = Math.max(
        1,
        Math.min(Math.ceil(economyFee * 0.5), economyFee)
      );

      const feeEstimate: FeeEstimate = {
        fastestFee,
        halfHourFee,
        hourFee,
        economyFee,
        minimumFee,
      };

      console.log('✅ Mempool.space block estimates:', feeEstimate);
      return feeEstimate;
    } catch (error) {
      console.warn('❌ Failed to fetch from Mempool.space estimates:', error);
      return null;
    }
  }

  private async fetchFromBlockstream(): Promise<FeeEstimate | null> {
    try {
      console.log('📊 Fetching fee estimates from Blockstream (fallback)...');
      
      const response = await rateLimitedFetch(`${BLOCKSTREAM_API}/fee-estimates`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BitcoinWallet/1.0',
        },
        ...(Platform.OS === 'web' ? { 
          mode: 'cors' as const,
          credentials: 'omit' as const,
        } : {}),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Blockstream returns fee estimates in sat/vB for different confirmation targets
      const feeEstimate: FeeEstimate = {
        fastestFee: Math.ceil(data['1'] || data['2'] || 20), // ~10 min (1-2 blocks)
        halfHourFee: Math.ceil(data['3'] || data['4'] || 15), // ~30 min (3-4 blocks)
        hourFee: Math.ceil(data['6'] || data['8'] || 10), // ~1 hour (6-8 blocks)
        economyFee: Math.ceil(data['18'] || data['24'] || 5), // ~3 hours (18-24 blocks)
        minimumFee: Math.ceil(data['144'] || data['504'] || 1), // ~24 hours (144-504 blocks)
      };

      console.log('✅ Blockstream fee estimates:', feeEstimate);
      return feeEstimate;
    } catch (error) {
      console.warn('❌ Failed to fetch from Blockstream:', error);
      return null;
    }
  }

  private getFallbackFees(): FeeEstimate {
    // Conservative fallback fee estimates (sat/vB)
    return {
      fastestFee: 25,
      halfHourFee: 15,
      hourFee: 10,
      economyFee: 5,
      minimumFee: 1,
    };
  }

  // Get recommended fee for target confirmation time
  async getRecommendedFee(target: 'fast' | 'medium' | 'slow' | 'economy'): Promise<number> {
    const fees = await this.getFeeEstimates();
    
    switch (target) {
      case 'fast':
        return fees.fastestFee;
      case 'medium':
        return fees.halfHourFee;
      case 'slow':
        return fees.hourFee;
      case 'economy':
        return fees.economyFee;
      default:
        return fees.halfHourFee;
    }
  }

  // Force refresh fee estimates (bypass cache)
  async refreshFeeEstimates(): Promise<FeeEstimate> {
    console.log('🔄 Force refreshing fee estimates...');
    this.cachedFees = null;
    this.lastFetchTime = 0;
    return this.getFeeEstimates();
  }

  // Get current network congestion level
  async getNetworkCongestion(): Promise<'low' | 'medium' | 'high'> {
    try {
      const fees = await this.getFeeEstimates();
      const fastFee = fees.fastestFee;
      
      if (fastFee <= 10) {
        return 'low';
      } else if (fastFee <= 50) {
        return 'medium';
      } else {
        return 'high';
      }
    } catch (error) {
      console.warn('Failed to determine network congestion:', error);
      return 'medium'; // Default to medium
    }
  }

  // Get fee estimate with confidence interval
  async getFeeWithConfidence(target: 'fast' | 'medium' | 'slow' | 'economy'): Promise<{
    fee: number;
    confidence: 'high' | 'medium' | 'low';
    timeEstimate: string;
  }> {
    const fees = await this.getFeeEstimates();
    const congestion = await this.getNetworkCongestion();
    
    let fee: number;
    let timeEstimate: string;
    let confidence: 'high' | 'medium' | 'low';
    
    switch (target) {
      case 'fast':
        fee = fees.fastestFee;
        timeEstimate = congestion === 'high' ? '10-30 min' : '5-15 min';
        confidence = congestion === 'low' ? 'high' : 'medium';
        break;
      case 'medium':
        fee = fees.halfHourFee;
        timeEstimate = congestion === 'high' ? '30-90 min' : '20-45 min';
        confidence = 'high';
        break;
      case 'slow':
        fee = fees.hourFee;
        timeEstimate = congestion === 'high' ? '1-3 hours' : '45-90 min';
        confidence = 'high';
        break;
      case 'economy':
        fee = fees.economyFee;
        timeEstimate = congestion === 'high' ? '3-12 hours' : '2-6 hours';
        confidence = congestion === 'low' ? 'high' : 'medium';
        break;
      default:
        fee = fees.halfHourFee;
        timeEstimate = '30-60 min';
        confidence = 'medium';
    }
    
    return { fee, confidence, timeEstimate };
  }
}

// Transaction size estimation
export class TransactionSizeEstimator {
  // Input sizes by address type (in bytes)
  private static readonly INPUT_SIZES = {
    'p2pkh': 148, // Legacy
    'p2sh-p2wpkh': 91, // Nested SegWit
    'p2wpkh': 68, // Native SegWit
  };

  // Output size (typically 34 bytes for P2WPKH, 32 for P2PKH)
  private static readonly OUTPUT_SIZE = 34;

  static estimateSize(
    inputCount: number, 
    outputCount: number, 
    addressType: 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh' = 'p2wpkh'
  ): number {
    // Base transaction size
    let size = 10; // version (4) + input count (1) + output count (1) + locktime (4)
    
    // Add input sizes
    size += inputCount * this.INPUT_SIZES[addressType];
    
    // Add output sizes
    size += outputCount * this.OUTPUT_SIZE;
    
    return Math.ceil(size);
  }

  static estimateVirtualSize(
    inputCount: number, 
    outputCount: number, 
    addressType: 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh' = 'p2wpkh'
  ): number {
    // For SegWit transactions, we need to calculate virtual size
    if (addressType === 'p2wpkh') {
      // Native SegWit has witness data
      const baseSize = 10 + (inputCount * 41) + (outputCount * 34); // Base transaction without witness
      const witnessSize = inputCount * 27; // Witness data per input
      const totalSize = baseSize + witnessSize;
      const virtualSize = Math.ceil((baseSize * 3 + totalSize) / 4);
      return virtualSize;
    } else if (addressType === 'p2sh-p2wpkh') {
      // P2SH-wrapped SegWit
      const baseSize = 10 + (inputCount * 64) + (outputCount * 34);
      const witnessSize = inputCount * 27;
      const totalSize = baseSize + witnessSize;
      const virtualSize = Math.ceil((baseSize * 3 + totalSize) / 4);
      return virtualSize;
    } else {
      // Legacy transactions don't have witness data
      return this.estimateSize(inputCount, outputCount, addressType);
    }
  }

  static calculateFee(
    inputCount: number, 
    outputCount: number, 
    feeRate: number, 
    addressType: 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh' = 'p2wpkh'
  ): number {
    const vsize = this.estimateVirtualSize(inputCount, outputCount, addressType);
    return Math.ceil(vsize * feeRate);
  }
}

// UTXO selection algorithms
export class UTXOSelector {
  // Simple greedy selection algorithm
  static selectGreedy(
    utxos: UTXO[], 
    targetAmount: number, 
    feeRate: number,
    addressType: 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh' = 'p2wpkh'
  ): { selectedUTXOs: UTXO[]; fee: number; change: number } {
    // Filter out frozen UTXOs and sort by value (largest first for efficiency)
    const availableUTXOs = utxos
      .filter(utxo => !utxo.frozen && utxo.status.confirmed)
      .sort((a, b) => b.value - a.value);

    if (availableUTXOs.length === 0) {
      throw new Error('No available UTXOs');
    }

    const selectedUTXOs: UTXO[] = [];
    let totalSelected = 0;

    // Simple greedy selection algorithm
    for (const utxo of availableUTXOs) {
      selectedUTXOs.push(utxo);
      totalSelected += utxo.value;

      // Calculate fee for current selection (2 outputs: recipient + change)
      const fee = TransactionSizeEstimator.calculateFee(
        selectedUTXOs.length, 
        2, 
        feeRate, 
        addressType
      );
      const totalNeeded = targetAmount + fee;

      if (totalSelected >= totalNeeded) {
        const change = totalSelected - totalNeeded;
        return { selectedUTXOs, fee, change };
      }
    }

    throw new Error('Insufficient funds');
  }

  // Branch and bound algorithm for optimal selection
  static selectOptimal(
    utxos: UTXO[], 
    targetAmount: number, 
    feeRate: number,
    addressType: 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh' = 'p2wpkh'
  ): { selectedUTXOs: UTXO[]; fee: number; change: number } {
    // For simplicity, fall back to greedy for now
    // In a production app, you'd implement a proper branch and bound algorithm
    return this.selectGreedy(utxos, targetAmount, feeRate, addressType);
  }

  // Knapsack algorithm for privacy-focused selection
  static selectPrivacy(
    utxos: UTXO[], 
    targetAmount: number, 
    feeRate: number,
    addressType: 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh' = 'p2wpkh'
  ): { selectedUTXOs: UTXO[]; fee: number; change: number } {
    // Try to select UTXOs that minimize change output for privacy
    const availableUTXOs = utxos
      .filter(utxo => !utxo.frozen && utxo.status.confirmed)
      .sort((a, b) => a.value - b.value); // Sort by value (smallest first)

    // Try to find exact match first
    for (const utxo of availableUTXOs) {
      const fee = TransactionSizeEstimator.calculateFee(1, 1, feeRate, addressType);
      if (utxo.value >= targetAmount + fee && utxo.value <= targetAmount + fee + 1000) {
        // Close enough to avoid change output
        return {
          selectedUTXOs: [utxo],
          fee,
          change: utxo.value - targetAmount - fee,
        };
      }
    }

    // Fall back to greedy if no exact match
    return this.selectGreedy(utxos, targetAmount, feeRate, addressType);
  }
}

// RBF (Replace-by-Fee) utilities
export class RBFManager {
  static canRBF(transaction: any): boolean {
    // Check if any input has sequence number < 0xfffffffe
    return transaction.inputs?.some((input: any) => input.sequence < 0xfffffffe) || false;
  }

  static calculateRBFFee(originalFee: number, originalSize: number, newSize: number): number {
    // RBF requires fee to be higher by at least 1 sat/vB
    const minFeeIncrease = Math.max(1, Math.ceil(newSize * 0.001)); // At least 1 sat/vB increase
    return originalFee + minFeeIncrease;
  }
}

// CPFP (Child-Pays-for-Parent) utilities
export class CPFPManager {
  static calculateCPFPFee(
    parentTxSize: number, 
    childTxSize: number, 
    parentFeeRate: number, 
    targetFeeRate: number
  ): number {
    const totalSize = parentTxSize + childTxSize;
    const targetTotalFee = totalSize * targetFeeRate;
    const parentFee = parentTxSize * parentFeeRate;
    const requiredChildFee = targetTotalFee - parentFee;
    
    return Math.max(requiredChildFee, childTxSize); // At least 1 sat/vB for child
  }
}

// Export singleton instance
export const feeEstimationService = FeeEstimationService.getInstance();