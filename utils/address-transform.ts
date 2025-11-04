/**
 * Address Data Transformation Utilities
 * 
 * Shared utilities for transforming address data between service and UI formats
 */

export interface AddressInfo {
  address: string;
  index: number;
  balance: number;
  txCount: number;
  receivedCount: number;
  sentCount: number;
  isUsed: boolean;
  type: 'receiving' | 'change';
  derivationPath: string;
}

export interface AddressServiceData {
  address: string;
  index: number;
  isUsed: boolean;
  balance: number;
  txCount: number;
  type: 'receiving' | 'change';
}

/**
 * Transform address data from service format to UI format
 * @param receivingData - Array of receiving addresses from service
 * @param changeData - Array of change addresses from service
 * @returns Array of addresses in UI format with derivation paths
 */
export function transformAddressDataForUI(
  receivingData: AddressServiceData[],
  changeData: AddressServiceData[]
): AddressInfo[] {
  const allAddresses: AddressInfo[] = [...receivingData, ...changeData].map((addrData) => ({
    address: addrData.address,
    index: addrData.index,
    balance: addrData.balance,
    txCount: addrData.txCount,
    receivedCount: 0, // Will be calculated separately if needed
    sentCount: 0, // Will be calculated separately if needed
    isUsed: addrData.isUsed,
    type: addrData.type,
    derivationPath: `m/84'/0'/0'/${addrData.type === 'receiving' ? '0' : '1'}/${addrData.index}`
  }));

  return allAddresses;
}

/**
 * Get derivation path for an address
 * @param type - Address type (receiving or change)
 * @param index - Address index
 * @returns BIP84 derivation path string
 */
export function getDerivationPath(
  type: 'receiving' | 'change',
  index: number
): string {
  const chainIndex = type === 'receiving' ? '0' : '1';
  return `m/84'/0'/0'/${chainIndex}/${index}`;
}
