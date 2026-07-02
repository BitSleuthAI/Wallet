import { ScreenLoading } from '@/components/ScreenLoading';
import { GradientBackground } from '@/components/GradientBackground';
import { LiquidGlassView } from '@/components/LiquidGlassView';
import QRScanner from '@/components/QRScanner';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import WalletSelector from '@/components/WalletSelector';
import { createButtonStyle, createInputStyle, platformStyles } from '@/constants/themes';
import { useAutoLock } from '@/hooks/auto-lock-store';
import { useTabAnimation } from '@/hooks/use-tab-animation';
import { useWallet } from '@/hooks/wallet-store';
import { isValidBitcoinAddress, sendTransaction } from '@/services/bitcoin-service';
import { feeEstimationService } from '@/services/fee-service';
import { HapticService } from '@/services/haptic-service';
import type { UTXO } from '@/types/wallet';
import { Stack, router } from 'expo-router';
import { AlertCircle, ArrowUpRight, CheckCircle, ChevronRight, Coins, QrCode } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Wrapper component that checks for context availability
export default function SendScreen() {
  if (__DEV__) {
    console.log('🔍 Send screen: Component mounted/rendered');
  }
  const walletContext = useWallet();

  // Safety check: if context is not available yet, show loading
  if (!walletContext) {
    return <ScreenLoading />;
  }

  return <SendScreenContent />;
}

// Main component with all hooks
function SendScreenContent() {
  const { animatedStyle } = useTabAnimation(1);
  const {
    currentWallet,
    balance,
    theme,
    coinControl,
    selectedCurrency,
    getCurrencySymbol,
    bitcoinPrice: walletBitcoinPrice,
    feeSettings,
    setFeeSettings,
    feeSettingsLoading,
    incrementUsageCount,
    utxos: walletUtxos,
    refreshData,
    getMnemonic,
  } = useWallet()!; // Non-null assertion is safe here because wrapper checked
  const { authenticateForTransactionEnhanced, isEnhancedSecurityRequired } = useAutoLock();

  // Initialize all state hooks
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isAmountInBTC, setIsAmountInBTC] = useState(true);
  const [feeRate, setFeeRate] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    message: string | null;
  }>({ isValid: false, message: null });
  const [feeEstimates, setFeeEstimates] = useState<any>(null);
  const [feeWithConfidence, setFeeWithConfidence] = useState<{
    fast: { fee: number; confidence: string; timeEstimate: string };
    medium: { fee: number; confidence: string; timeEstimate: string };
    slow: { fee: number; confidence: string; timeEstimate: string };
  } | null>(null);
  const [selectedUtxoIds, setSelectedUtxoIds] = useState<string[]>([]);
  const [availableUtxos, setAvailableUtxos] = useState<UTXO[]>([]);
  const [customFeeValidation, setCustomFeeValidation] = useState<{
    isValid: boolean;
    message: string | null;
  }>({ isValid: true, message: null });

  // Memoize computed values from feeSettings to prevent unnecessary re-renders
  const selectedFeeType = useMemo(() =>
    feeSettings?.defaultPreset === 'economy' ? 'slow' :
      feeSettings?.defaultPreset === 'standard' ? 'normal' :
        feeSettings?.defaultPreset === 'priority' ? 'fast' : 'custom',
    [feeSettings?.defaultPreset]
  );
  const enableRBF = useMemo(() => feeSettings?.enableRBF ?? true, [feeSettings?.enableRBF]);
  const customFeeRate = useMemo(() => feeSettings?.customFeeRate?.toString() ?? '10', [feeSettings?.customFeeRate]);
  // Use Bitcoin price from wallet store (already converted to selected currency)
  const bitcoinPrice = useMemo(() => walletBitcoinPrice?.usd || null, [walletBitcoinPrice?.usd]);

  // Memoize handlers to prevent recreation on every render
  const handleFeePresetChange = useCallback((preset: 'slow' | 'normal' | 'fast' | 'custom') => {
    HapticService.light();
    console.log(`🔧 Send screen: Fee preset changed to ${preset}`);
    console.log(`🔧 Current feeSettings.defaultPreset: ${feeSettings?.defaultPreset}`);

    // Map send screen preset to fee settings preset
    const feeSettingsPreset = preset === 'slow' ? 'economy' :
      preset === 'normal' ? 'standard' :
        preset === 'fast' ? 'priority' : 'custom';

    console.log(`🔧 Mapped to fee settings preset: ${feeSettingsPreset}`);

    // Update wallet store directly with properly typed preset
    const allowedPresets = ['economy', 'standard', 'priority', 'custom'] as const;
    type AllowedPreset = typeof allowedPresets[number];
    const validPreset: AllowedPreset = allowedPresets.includes(feeSettingsPreset as AllowedPreset)
      ? (feeSettingsPreset as AllowedPreset)
      : (console.warn(`❌ Invalid feeSettingsPreset: ${feeSettingsPreset}. Falling back to 'standard'.`), 'standard' as const);

    const updatedSettings = { ...feeSettings, defaultPreset: validPreset };
    console.log(`🔧 Updating wallet store with:`, updatedSettings);
    setFeeSettings(updatedSettings).catch(error => {
      console.error(`❌ Failed to update fee preset:`, error);
    });
  }, [feeSettings, setFeeSettings]);

  const handleRBFChange = useCallback((value: boolean) => {
    console.log(`🔧 Send screen: RBF changed to ${value}`);
    console.log(`🔧 Current feeSettings.enableRBF: ${feeSettings?.enableRBF}`);

    // Update wallet store directly
    const updatedSettings = { ...feeSettings, enableRBF: value };
    console.log(`🔧 Updating wallet store with:`, updatedSettings);
    setFeeSettings(updatedSettings).catch(error => {
      console.error(`❌ Failed to update RBF setting:`, error);
    });
  }, [feeSettings, setFeeSettings]);

  const handleCustomFeeRateChange = useCallback((rate: string) => {
    console.log(`🔧 Send screen: Custom fee rate changed to ${rate}`);

    const numericValue = parseInt(rate) || 0;

    // Update wallet store directly with properly typed preset
    const updatedSettings = {
      ...feeSettings,
      customFeeRate: numericValue,
      defaultPreset: 'custom' as const // Auto-set to custom when user changes rate
    };
    setFeeSettings(updatedSettings).catch(error => {
      console.error(`❌ Failed to update custom fee rate:`, error);
    });
  }, [feeSettings, setFeeSettings]);

  // Load fee estimates on component mount and wallet change
  useEffect(() => {
    const loadFeeEstimates = async () => {
      try {
        const fees = await feeEstimationService.getFeeEstimates().catch(() => null);
        setFeeEstimates(fees);

        // Load fee confidence data
        if (fees) {
          try {
            const [fastInfo, mediumInfo, slowInfo] = await Promise.all([
              feeEstimationService.getFeeWithConfidence('fast'),
              feeEstimationService.getFeeWithConfidence('medium'),
              feeEstimationService.getFeeWithConfidence('economy')
            ]);

            setFeeWithConfidence({
              fast: fastInfo || { fee: 0, confidence: 'Unknown', timeEstimate: 'Unknown' },
              medium: mediumInfo || { fee: 0, confidence: 'Unknown', timeEstimate: 'Unknown' },
              slow: slowInfo || { fee: 0, confidence: 'Unknown', timeEstimate: 'Unknown' }
            });
          } catch (error) {
            console.warn('Failed to load fee confidence data:', error);
          }
        }
      } catch (error) {
        console.warn('Failed to load fee estimates:', error);
      }
    };

    loadFeeEstimates();
  }, [currentWallet]);

  // Periodic fee refresh for auto-adjustment - DISABLED to prevent excessive API calls
  useEffect(() => {
    if (!feeSettings?.autoAdjustFees) {
      return;
    }

    // DISABLED: This was causing excessive API calls and HTTP 429 errors
    // Instead, fees will be refreshed only when user manually triggers a refresh
    // or when the component mounts/remounts
    console.log('🔄 Periodic fee refresh DISABLED to prevent excessive API calls');

    // Optional: Refresh fees only once when auto-adjustment is enabled
    const refreshOnce = async () => {
      try {
        console.log('🔄 One-time fee refresh for auto-adjustment...');
        const freshEstimates = await feeEstimationService.refreshFeeEstimates();
        setFeeEstimates(freshEstimates);
      } catch (error) {
        console.warn('Failed to refresh fees for auto-adjustment:', error);
      }
    };

    refreshOnce();
  }, [feeSettings?.autoAdjustFees]);

  // No sync effects needed - React automatically re-renders when feeSettings changes

  // Fee rate updates - handles both initial load and network estimate updates
  useEffect(() => {
    if (feeSettingsLoading || !feeSettings) return;

    console.log(`🔧 Send screen: Fee rate update effect running`);
    console.log(`🔧 Current feeSettings.defaultPreset: ${feeSettings.defaultPreset}`);
    console.log(`🔧 Current feeRate: ${feeRate}`);

    // Update fee rates based on current preset
    if (feeSettings.defaultPreset === 'custom') {
      // For custom preset, use the stored custom fee rate
      console.log(`🔧 Setting fee rate to custom: ${feeSettings.customFeeRate}`);
      setFeeRate(feeSettings.customFeeRate);
    } else if (feeEstimates && feeEstimates.economyFee && feeEstimates.halfHourFee && feeEstimates.fastestFee) {
      // Use network estimates when available
      const presetFee = feeSettings.defaultPreset === 'economy' ? feeEstimates.economyFee :
        feeSettings.defaultPreset === 'standard' ? feeEstimates.halfHourFee :
          feeSettings.defaultPreset === 'priority' ? feeEstimates.fastestFee :
            feeEstimates.halfHourFee;
      console.log(`🔧 Setting fee rate to network estimate: ${presetFee} for preset ${feeSettings.defaultPreset}`);
      setFeeRate(presetFee);
    } else {
      // Use fallback rates when estimates aren't available
      const fallbackRate = feeSettings.defaultPreset === 'economy' ? 1 :
        feeSettings.defaultPreset === 'standard' ? 5 :
          feeSettings.defaultPreset === 'priority' ? 15 :
            feeSettings.customFeeRate;
      console.log(`🔧 Setting fee rate to fallback: ${fallbackRate} for preset ${feeSettings.defaultPreset}`);
      setFeeRate(fallbackRate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeSettings, feeSettingsLoading, feeEstimates]); // feeRate is intentionally not included to prevent infinite loop

  // Auto-adjust fees based on network conditions - DISABLED to prevent overriding user selections
  useEffect(() => {
    // Disable auto-adjustment for now to prevent it from overriding user selections
    // setAutoAdjustmentActive(false) - removed as state variable is removed
    return;

  }, [feeEstimates, feeSettings, feeRate]);

  // Sync UTXOs from wallet store to local state with frozen status applied
  // NOTE: UTXOs are now automatically fetched and updated by wallet-store.ts with 30s polling
  console.log('🔍 Send screen: Setting up UTXO sync from wallet store');
  console.log('🔍 Send screen: currentWallet?.id:', currentWallet?.id, 'walletUtxos:', walletUtxos?.length || 0);

  useEffect(() => {
    console.log('🔍 Send screen: UTXO sync triggered');
    console.log('🔍 Send screen: currentWallet:', currentWallet ? currentWallet.name : 'null');
    console.log('🔍 Send screen: walletUtxos count:', walletUtxos?.length || 0);

    if (!currentWallet || !walletUtxos) {
      console.log('🔍 Send screen: No wallet or UTXOs available, clearing availableUtxos');
      setAvailableUtxos([]);
      return;
    }

    // Apply frozen status from coin control to wallet UTXOs
    const frozenIds = new Set(coinControl.getFrozenUtxoIds());
    const utxosWithFrozenStatus = walletUtxos.map((utxo: UTXO) => ({
      ...utxo,
      frozen: frozenIds.has(`${utxo.txid}:${utxo.vout}`)
    }));

    console.log('🔍 Send screen: Synced', utxosWithFrozenStatus.length, 'UTXOs from wallet store');
    console.log('🔍 Send screen: UTXOs details:', utxosWithFrozenStatus.slice(0, 5).map((u: UTXO) => ({
      txid: u.txid?.substring(0, 10) + '...',
      vout: u.vout,
      value: u.value,
      address: u.address?.substring(0, 10) + '...',
      frozen: u.frozen,
      status: u.status
    })));

    setAvailableUtxos(utxosWithFrozenStatus);
  }, [currentWallet?.id, currentWallet, walletUtxos, coinControl]);

  useEffect(() => {
    const frozenIds = new Set(coinControl.getFrozenUtxoIds());
    const ids = coinControl.getSelectedUtxoIds().filter((id: string) => !frozenIds.has(id));
    setSelectedUtxoIds(ids);
  }, [currentWallet?.id, coinControl]); // Re-sync when wallet changes or coinControl updates

  // Validate Bitcoin address in real-time
  useEffect(() => {
    if (!recipientAddress.trim()) {
      setAddressValidation({ isValid: false, message: null });
      return;
    }

    const validateAddress = () => {
      try {
        const isValid = isValidBitcoinAddress(recipientAddress.trim());
        if (isValid) {
          setAddressValidation({
            isValid: true,
            message: 'Valid Bitcoin address'
          });
        } else {
          setAddressValidation({
            isValid: false,
            message: 'Invalid Bitcoin address format'
          });
        }
      } catch {
        setAddressValidation({
          isValid: false,
          message: 'Invalid address format'
        });
      }
    };

    const timeoutId = setTimeout(validateAddress, 300);
    return () => clearTimeout(timeoutId);
  }, [recipientAddress]);

  // Calculate estimated fee when inputs change
  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && feeRate > 0) {
      try {
        // Estimate transaction size (1 input, 2 outputs for change)
        const estimatedSize = 250; // bytes (conservative estimate)
        const feeInSats = estimatedSize * feeRate;
        const feeInBTC = feeInSats / 100000000;
        setEstimatedFee(feeInBTC);
      } catch (error) {
        console.warn('Error calculating fee estimate:', error);
        setEstimatedFee(null);
      }
    } else {
      setEstimatedFee(null);
    }
  }, [amount, feeRate]);

  const handleSendMax = useCallback(() => {
    HapticService.light();
    try {
      if (balance > 0) {
        // Calculate more accurate fee estimate
        const estimatedSize = 250; // bytes
        const feeInSats = estimatedSize * feeRate;
        const feeInBTC = feeInSats / 100000000;
        const maxSendable = Math.max(0, balance - feeInBTC);

        if (maxSendable <= 0) {
          Alert.alert('Error', 'Insufficient balance to cover transaction fees');
          return;
        }

        setAmount(maxSendable.toFixed(8));
      } else {
        Alert.alert('Error', 'No balance available to send');
      }
    } catch (error) {
      console.error('Error calculating max send amount:', error);
      Alert.alert('Error', 'Failed to calculate maximum sendable amount');
    }
  }, [balance, feeRate]);

  const handleQRScan = useCallback((data: string) => {
    try {
      // Handle different QR code formats
      let address = data.trim();

      // Handle bitcoin: URI format
      if (address.startsWith('bitcoin:')) {
        const url = new URL(address);
        address = url.pathname;

        // Extract amount if present
        const amountParam = url.searchParams.get('amount');
        if (amountParam) {
          setAmount(amountParam);
        }
      }

      setRecipientAddress(address);
      setShowQRScanner(false);
    } catch (error) {
      console.error('Error parsing QR code:', error);
      Alert.alert('Error', 'Invalid QR code format');
    }
  }, []);

  const convertAmount = useCallback((value: string, fromBTC: boolean): string => {
    if (!value || !bitcoinPrice || bitcoinPrice <= 0) return '';

    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) return '';

      if (fromBTC) {
        // Convert BTC to selected fiat currency
        const result = (numValue * bitcoinPrice).toFixed(2);
        return result && result !== '0.00' ? result : '';
      } else {
        // Convert selected fiat currency to BTC
        const result = (numValue / bitcoinPrice).toFixed(8);
        return result && result !== '0.00000000' ? result : '';
      }
    } catch {
      return '';
    }
  }, [bitcoinPrice]);

  const handleAmountChange = useCallback((value: string) => {
    setAmount(value);
  }, []);

  const toggleCurrency = useCallback(() => {
    if (amount && bitcoinPrice && bitcoinPrice > 0) {
      const convertedAmount = convertAmount(amount, isAmountInBTC);
      if (convertedAmount) {
        setAmount(convertedAmount);
      }
    }
    setIsAmountInBTC(!isAmountInBTC);
  }, [amount, bitcoinPrice, isAmountInBTC, convertAmount]);

  const handleSendTransaction = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      // Convert amount to BTC for security assessment
      let amountInBTC: number;
      if (isAmountInBTC) {
        amountInBTC = parseFloat(amount);
      } else {
        // Convert selected fiat currency to BTC
        if (!bitcoinPrice || bitcoinPrice <= 0) {
          Alert.alert('Error', 'Unable to get current Bitcoin price. Please try again.');
          return;
        }
        amountInBTC = parseFloat(amount) / bitcoinPrice;
      }

      const requireBiometricAuth = await isEnhancedSecurityRequired(amountInBTC);

      if (requireBiometricAuth) {
        const biometricSuccess = await authenticateForTransactionEnhanced(true);

        if (!biometricSuccess) {
          Alert.alert(
            'Biometric Required',
            'Biometric authentication is required to send funds. Please complete biometric verification and try again.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Comprehensive validation
      if (!recipientAddress.trim()) {
        Alert.alert('Error', 'Please enter a recipient address');
        return;
      }

      if (!amount.trim()) {
        Alert.alert('Error', 'Please enter an amount');
        return;
      }

      // Validate recipient address
      if (!addressValidation.isValid) {
        Alert.alert('Error', 'Please enter a valid Bitcoin address');
        return;
      }

      // Validate amount
      if (isNaN(amountInBTC) || amountInBTC <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      // Check minimum amount (dust limit)
      const dustThreshold = (feeSettings && feeSettings.dustThreshold) ? feeSettings.dustThreshold : 546;
      const dustLimit = dustThreshold / 100000000; // Convert satoshis to BTC
      if (amountInBTC < dustLimit) {
        const dustLimitText = dustLimit.toString();
        const errorMessage = `Amount too small. Minimum amount is ${dustLimitText} BTC (${dustThreshold} sats)`;
        Alert.alert('Error', errorMessage);
        return;
      }

      // Check balance including estimated fee
      const totalNeeded = amountInBTC + (estimatedFee || 0.0001);
      if (totalNeeded > balance) {
        const totalNeededText = totalNeeded.toFixed(8);
        const balanceText = balance.toFixed(8);
        Alert.alert(
          'Insufficient Balance',
          `You need ${totalNeededText} BTC (including fees) but only have ${balanceText} BTC available.`
        );
        return;
      }

      // Validate fee rate for custom fee type
      if (selectedFeeType === 'custom') {
        const customRate = parseFloat(customFeeRate);
        const maxRate = (feeSettings && feeSettings.maxFeeRate) ? feeSettings.maxFeeRate : 100;

        if (isNaN(customRate) || customRate <= 0) {
          Alert.alert('Error', 'Please enter a valid custom fee rate');
          return;
        }

        if (customRate > maxRate) {
          Alert.alert(
            'Fee Rate Too High',
            `Custom fee rate cannot exceed ${maxRate} sat/vB. Please enter a lower value.`
          );
          return;
        }
      }

      console.log('🚀 Starting real Bitcoin transaction send process...');
      if (__DEV__) {
        const truncatedAddress = recipientAddress.substring(0, 20) + '...';
        console.log('Transaction details:', {
          from: currentWallet?.name,
          to: truncatedAddress,
          amount: amountInBTC,
          feeRate,
          enableRBF,
          network: 'mainnet',
          enhancedSecurity: isEnhancedSecurityRequired
        });
      }

      // Send the real transaction
      const selected = availableUtxos.filter(u => selectedUtxoIds.includes(`${u.txid}:${u.vout}`));

      // Validate wallet addresses and current index
      if (__DEV__) {
        console.log('🔍 Wallet validation - addresses count:', currentWallet.addresses?.length || 0);
        console.log('🔍 Wallet validation - current address index:', currentWallet.currentAddressIndex);
        console.log('🔍 Wallet validation - available UTXOs count:', availableUtxos.length);
        console.log('🔍 Wallet validation - selected UTXOs count:', selected.length);
      }

      if (!currentWallet.addresses || currentWallet.addresses.length === 0) {
        console.error('❌ No addresses available in wallet');
        throw new Error('No addresses available in wallet');
      }

      if (currentWallet.currentAddressIndex < 0 || currentWallet.currentAddressIndex >= currentWallet.addresses.length) {
        console.error('❌ Invalid current address index:', currentWallet.currentAddressIndex, 'out of', currentWallet.addresses.length);
        throw new Error('Invalid current address index');
      }

      // SECURITY FIX: Retrieve mnemonic from secure storage
      console.log('🔐 Retrieving mnemonic from secure storage...');
      const mnemonic = await getMnemonic(currentWallet.id);
      if (!mnemonic || mnemonic.trim() === '') {
        console.error('❌ Failed to retrieve wallet mnemonic from secure storage');
        throw new Error('Failed to retrieve wallet mnemonic. Please try again.');
      }
      console.log('✅ Mnemonic retrieved from secure storage');

      // Get the current address and its index for signing
      const currentAddress = currentWallet.addresses[currentWallet.currentAddressIndex];
      const addressIndex = currentWallet.currentAddressIndex;

      if (__DEV__) {
        console.log('🔍 Using current address:', currentAddress.substring(0, 10) + '...');
        console.log('🔍 Send screen: Wallet addresses being passed to sendTransaction:', currentWallet.addresses.length);
        console.log('🔍 Send screen: availableUtxos.length:', availableUtxos.length);
        console.log('🔍 Send screen: selected.length:', selected.length);
        console.log('🔍 Send screen: availableUtxos details:', availableUtxos.map(u => ({
          txid: u.txid.substring(0, 10) + '...',
          vout: u.vout,
          value: u.value,
          address: u.address?.substring(0, 10) + '...',
          addressIndex: u.addressIndex,
          frozen: u.frozen
        })));
        console.log('🔍 Send screen: selectedUtxoIds:', selectedUtxoIds);
        console.log('🔍 Send screen: coinControl.getWalletUtxos result:', coinControl.getWalletUtxos(currentWallet.id));
        console.log('🔍 Send screen: coinControl.isUtxosLoading result:', coinControl.isUtxosLoading(currentWallet.id));
      }

      // If no UTXOs are selected via coin control, automatically select the most efficient UTXOs
      let utxosToUse: UTXO[];
      if (selected.length > 0) {
        // Filter out frozen UTXOs from manually selected UTXOs
        // This prevents accidentally using frozen coins
        const unfrozenSelected = selected.filter(utxo => !utxo.frozen && utxo.status?.confirmed);

        if (unfrozenSelected.length === 0) {
          console.warn('⚠️ All manually selected UTXOs are frozen or unconfirmed');
          throw new Error('All selected UTXOs are either frozen or unconfirmed. Please select different UTXOs or wait for confirmations.');
        }

        utxosToUse = unfrozenSelected;
        if (__DEV__) {
          console.log('🔍 Send screen: Using manually selected unfrozen UTXOs:', utxosToUse.length);
          if (unfrozenSelected.length < selected.length) {
            console.log('🔍 Send screen: Filtered out', selected.length - unfrozenSelected.length, 'frozen/unconfirmed UTXOs');
          }
        }
      } else {
        // Automatic UTXO selection: choose confirmed UTXOs (not frozen) - BlueWallet approach
        const unfrozenUtxos = availableUtxos.filter(utxo => !utxo.frozen && utxo.status?.confirmed);
        if (__DEV__) console.log('🔍 Send screen: Available confirmed unfrozen UTXOs:', unfrozenUtxos.length);

        if (unfrozenUtxos.length === 0) {
          console.warn('⚠️ No confirmed unfrozen UTXOs available for automatic selection');
          throw new Error('No confirmed UTXOs available for transaction. Please ensure you have confirmed Bitcoin in your wallet.');
        }

        // Sort UTXOs by value (largest first) for efficient selection - BlueWallet approach
        const sortedUtxos = unfrozenUtxos.sort((a, b) => b.value - a.value);

        // Calculate total needed (amount + estimated fee)
        const amountSatoshis = Math.floor(amountInBTC * 1e8);
        const estimatedFeeSatoshis = Math.floor((estimatedFee || 0.0001) * 1e8);
        const totalNeeded = amountSatoshis + estimatedFeeSatoshis;

        if (__DEV__) {
          console.log('🔍 Send screen: Amount needed:', amountSatoshis, 'sats');
          console.log('🔍 Send screen: Estimated fee:', estimatedFeeSatoshis, 'sats');
          console.log('🔍 Send screen: Total needed:', totalNeeded, 'sats');
        }

        // Greedy selection: pick UTXOs until we have enough - BlueWallet approach
        const selectedUtxos: UTXO[] = [];
        let totalSelected = 0;

        for (const utxo of sortedUtxos) {
          selectedUtxos.push(utxo);
          totalSelected += utxo.value;

          if (totalSelected >= totalNeeded) {
            break; // We have enough UTXOs
          }
        }

        if (totalSelected < totalNeeded) {
          console.error('❌ Insufficient funds: need', totalNeeded, 'have', totalSelected);
          throw new Error(`Insufficient funds. Need ${totalNeeded} sats but only have ${totalSelected} sats available.`);
        }

        utxosToUse = selectedUtxos;
        if (__DEV__) {
          console.log('🔍 Send screen: Automatically selected', utxosToUse.length, 'UTXOs');
          console.log('🔍 Send screen: Total selected value:', totalSelected, 'sats');
          console.log('🔍 Send screen: Change amount:', totalSelected - totalNeeded, 'sats');
          console.log('🔍 Send screen: Sample selected UTXO:', utxosToUse[0] ? {
            txid: utxosToUse[0].txid.substring(0, 10) + '...',
            vout: utxosToUse[0].vout,
            value: utxosToUse[0].value,
            address: utxosToUse[0].address?.substring(0, 10) + '...'
          } : 'No UTXOs');
        }
      }

      if (__DEV__) {
        console.log('🔍 Send screen: UTXOs to use for transaction:', utxosToUse.length);
        console.log('🔍 Available UTXOs:', availableUtxos.length);
        console.log('🔍 Selected UTXOs:', selected.length);
        if (utxosToUse.length > 0) {
          console.log('✅ Send screen: Passing', utxosToUse.length, 'UTXOs to sendTransaction');
        } else {
          console.log('⚠️ Send screen: No UTXOs to pass to sendTransaction, will let it fetch fresh');
        }
      }

      const result = await sendTransaction(
        currentAddress,
        recipientAddress.trim(),
        amountInBTC,
        feeRate,
        mnemonic,
        addressIndex,
        enableRBF,
        utxosToUse.length > 0 ? utxosToUse : undefined,
        currentWallet.addresses
      );

      console.log('✅ Real Bitcoin transaction sent successfully:', result);
      HapticService.transactionSuccess();

      // Show success message with transaction details
      const feeFiat = bitcoinPrice && bitcoinPrice > 0 ? (result.fee * bitcoinPrice).toFixed(2) : 'N/A';
      const amountFiat = bitcoinPrice && bitcoinPrice > 0 ? (amountInBTC * bitcoinPrice).toFixed(2) : 'N/A';

      const amountBTC = amountInBTC.toFixed(8);
      const feeBTC = result.fee.toFixed(8);
      const feeRateText = feeRate.toString();

      const successMessage = `Your Bitcoin transaction has been broadcast to the mainnet network.\n\n` +
        `Transaction ID: ${result.txid}\n\n` +
        `Amount: ${amountBTC} BTC (${getCurrencySymbol()}${amountFiat})\n` +
        `Fee: ${feeBTC} BTC (${getCurrencySymbol()}${feeFiat})\n` +
        `Fee Rate: ${feeRateText} sat/vB\n\n` +
        `The transaction will appear in your wallet once it receives confirmations. ` +
        `This typically takes 10-60 minutes depending on network congestion.`;

      // Refresh transaction history and balance to show the new transaction
      console.log('🔄 Refreshing wallet data after successful transaction...');
      await refreshData();

      Alert.alert(
        'Transaction Broadcast Successfully! 🎉',
        successMessage,
        [{
          text: 'View Transaction',
          onPress: () => {
            // Clear form
            setRecipientAddress('');
            setAmount('');
            setEstimatedFee(null);
            setAddressValidation({ isValid: false, message: null });

            // Navigate directly to transaction explorer with the txid
            router.push({
              pathname: '/transaction-explorer',
              params: { txid: result.txid },
            });
          }
        }, {
          text: 'Done',
          onPress: () => {
            // Clear form
            setRecipientAddress('');
            setAmount('');
            setEstimatedFee(null);
            setAddressValidation({ isValid: false, message: null });

            // Navigate to home to see updated balance
            router.push('/');
          }
        }]
      );

    } catch (error) {
      console.error('❌ Error sending Bitcoin transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Provide more specific error messages
      let userMessage = errorMessage;
      if (errorMessage.includes('Insufficient funds')) {
        userMessage = 'Insufficient funds. Please check your balance and try a smaller amount.';
      } else if (errorMessage.includes('Invalid address')) {
        userMessage = 'Invalid recipient address. Please check the address and try again.';
      } else if (errorMessage.includes('Network error')) {
        userMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorMessage.includes('Fee too low')) {
        userMessage = 'Transaction fee is too low. Please increase the fee rate and try again.';
      }

      const errorMessageText = `Failed to send Bitcoin transaction:\n\n${userMessage}\n\nPlease check your inputs and try again.`;
      HapticService.transactionError();
      Alert.alert(
        'Transaction Failed',
        errorMessageText,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewTransaction = () => {
    HapticService.medium();
    try {
      // Validate inputs
      if (!recipientAddress.trim()) {
        HapticService.warning();
        Alert.alert('Error', 'Please enter a recipient address');
        return;
      }

      if (!amount.trim()) {
        Alert.alert('Error', 'Please enter an amount');
        return;
      }

      // Validate recipient address
      if (!addressValidation.isValid) {
        Alert.alert('Error', 'Please enter a valid Bitcoin address');
        return;
      }

      // Convert amount to BTC for display
      let amountInBTC: number;
      let displayAmount: string;

      if (isAmountInBTC) {
        amountInBTC = parseFloat(amount);
        const btcText = `${amount} BTC`;
        displayAmount = btcText;
        if (bitcoinPrice && bitcoinPrice > 0) {
          const fiatValue = (amountInBTC * bitcoinPrice).toFixed(2);
          const fiatDisplay = ` (${getCurrencySymbol()}${fiatValue})`;
          displayAmount += fiatDisplay;
        }
      } else {
        if (!bitcoinPrice || bitcoinPrice <= 0) {
          Alert.alert('Error', 'Unable to get current Bitcoin price. Please try again.');
          return;
        }
        amountInBTC = parseFloat(amount) / bitcoinPrice;
        const btcAmount = amountInBTC.toFixed(8);
        const fiatBtcText = `${getCurrencySymbol()}${amount} (${btcAmount} BTC)`;
        displayAmount = fiatBtcText;
      }

      // Validate amount
      if (isNaN(amountInBTC) || amountInBTC <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      // Check balance including estimated fee
      const totalNeeded = amountInBTC + (estimatedFee || 0.0001);
      if (totalNeeded > balance) {
        const totalNeededText = totalNeeded.toFixed(8);
        const balanceText = balance.toFixed(8);
        Alert.alert(
          'Insufficient Balance',
          `You need ${totalNeededText} BTC (including fees) but only have ${balanceText} BTC available.`
        );
        return;
      }

      // Validate fee rate for custom fee type
      if (selectedFeeType === 'custom') {
        const customRate = parseFloat(customFeeRate);
        const maxRate = (feeSettings && feeSettings.maxFeeRate) ? feeSettings.maxFeeRate : 100;

        if (isNaN(customRate) || customRate <= 0) {
          Alert.alert('Error', 'Please enter a valid custom fee rate');
          return;
        }

        if (customRate > maxRate) {
          Alert.alert(
            'Fee Rate Too High',
            `Custom fee rate cannot exceed ${maxRate} sat/vB. Please enter a lower value.`
          );
          return;
        }
      }

      // Format fee display
      const feeDisplay = estimatedFee ? (() => {
        const feeAmount = estimatedFee.toFixed(8);
        const feeText = `${feeAmount} BTC`;
        return feeText;
      })() : 'Calculating...';
      const feeFiatDisplay = estimatedFee && bitcoinPrice && bitcoinPrice > 0 ? (() => {
        const fiatAmount = (estimatedFee * bitcoinPrice).toFixed(2);
        const fiatText = ` (${getCurrencySymbol()}${fiatAmount})`;
        return fiatText;
      })() : '';

      // Show comprehensive transaction review
      const feeDisplayText = feeFiatDisplay ? (() => {
        const combinedText = `${feeDisplay}${feeFiatDisplay}`;
        return combinedText;
      })() : feeDisplay;

      const recipientPreview = recipientAddress.slice(0, 30);
      const feeRateText = feeRate.toString();
      const rbfStatus = enableRBF ? 'Enabled' : 'Disabled';

      const reviewMessage = `You are about to send a REAL Bitcoin transaction on MAINNET:\n\n` +
        `📤 Send: ${displayAmount}\n` +
        `📍 To: ${recipientPreview}...\n\n` +
        `💰 Network Fee: ${feeDisplayText}\n` +
        `⚡ Fee Rate: ${feeRateText} sat/vB\n` +
        `🔄 RBF: ${rbfStatus}\n\n` +
        `⚠️ WARNING: This transaction cannot be reversed once broadcast!`;

      Alert.alert(
        '⚠️ Review Bitcoin Transaction',
        reviewMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Bitcoin',
            style: 'destructive',
            onPress: async () => {
              // Calculate amount for authentication
              const amountInBTC = isAmountInBTC ? parseFloat(amount) : (bitcoinPrice && bitcoinPrice > 0 ? parseFloat(amount) / bitcoinPrice : 0);

              // Always use enhanced security service to ensure MFA enforcement
              console.log('🔐 Checking if biometric authentication is required before final confirmation...');

              const requireBiometricAuth = await isEnhancedSecurityRequired(amountInBTC);

              if (requireBiometricAuth) {
                const biometricSuccess = await authenticateForTransactionEnhanced(true);

                if (!biometricSuccess) {
                  Alert.alert(
                    'Biometric Required',
                    'Biometric authentication is required to send funds. Please complete biometric verification and try again.',
                    [{ text: 'OK' }]
                  );
                  return;
                }
              }

              handleSendTransaction();
            }
          },
        ]
      );
    } catch (error) {
      console.error('Error reviewing transaction:', error);
      Alert.alert('Error', 'Failed to review transaction. Please try again.');
    }
  };

  const getTimeEstimateForFeeRate = useCallback((rate: number): string => {
    if (!feeEstimates) return 'Calculating...';

    if (rate >= feeEstimates.fastestFee) {
      return (feeWithConfidence?.fast?.timeEstimate && feeWithConfidence.fast.timeEstimate !== 'Unknown')
        ? feeWithConfidence.fast.timeEstimate
        : '5-20 min';
    } else if (rate >= feeEstimates.halfHourFee) {
      return (feeWithConfidence?.medium?.timeEstimate && feeWithConfidence.medium.timeEstimate !== 'Unknown')
        ? feeWithConfidence.medium.timeEstimate
        : '20-60 min';
    } else if (rate >= feeEstimates.economyFee) {
      return (feeWithConfidence?.slow?.timeEstimate && feeWithConfidence.slow.timeEstimate !== 'Unknown')
        ? feeWithConfidence.slow.timeEstimate
        : '2-6 hours';
    } else {
      return '6+ hours';
    }
  }, [feeEstimates, feeWithConfidence]);

  if (!currentWallet) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <SafeAreaView style={styles.container}>
          <Stack.Screen
            options={{
              title: 'Send',
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: theme.colors.text,
            }}
          />
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Wallet Found</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Create or import a wallet to send funds</Text>
            <TouchableOpacity
              style={[styles.setupButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push('/wallet-setup')}
            >
              <Text style={styles.setupButtonText}>Setup Wallet</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Show loading state while fee settings are being loaded
  if (feeSettingsLoading) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <SafeAreaView style={styles.container}>
          <Stack.Screen
            options={{
              title: 'Send',
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: theme.colors.text,
            }}
          />
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Loading...</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Preparing transaction settings</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Send',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: theme.colors.text,
          }}
        />

        <Animated.View style={[styles.animatedContainer, animatedStyle]}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* From Section */}
              <WalletSelector label="From:" />

              {/* Recipient Address */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Recipient Address</Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      createInputStyle(theme),
                      styles.textInput,
                    ]}
                    placeholder="Enter Bitcoin address (bc1q..., 1..., 3...)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={recipientAddress}
                    onChangeText={setRecipientAddress}
                    multiline
                    underlineColorAndroid="transparent"
                  />
                  <TouchableOpacity
                    style={styles.qrCodeButton}
                    onPress={() => {
                      setShowQRScanner(true);
                      incrementUsageCount('send_interaction');
                    }}
                  >
                    <QrCode color={theme.colors.primary} size={24} />
                  </TouchableOpacity>
                </View>

                {/* Address Validation Indicator */}
                {!!recipientAddress.trim() && !!addressValidation.message && (
                  <View style={styles.validationContainer}>
                    {addressValidation.isValid ? (
                      <View style={styles.validationRow}>
                        <CheckCircle color={theme.colors.success} size={16} />
                        <Text style={[styles.validationText, { color: theme.colors.success }]}>{addressValidation.message}</Text>
                      </View>
                    ) : (
                      <View style={styles.validationRow}>
                        <AlertCircle color={theme.colors.error} size={16} />
                        <Text style={[styles.validationText, { color: theme.colors.error }]}>{addressValidation.message}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Amount */}
              <View style={styles.inputSection}>
                <View style={styles.amountHeader}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                    Amount ({isAmountInBTC ? 'BTC' : selectedCurrency})
                  </Text>
                  <View style={styles.currencyToggle}>
                    <Text style={[styles.toggleLabel, { color: theme.colors.textSecondary }]}>BTC</Text>
                    <ThemedSwitch
                      value={!isAmountInBTC}
                      onValueChange={toggleCurrency}
                      theme={theme}
                      testID="currency-toggle"
                    />
                    <Text style={[styles.toggleLabel, { color: theme.colors.textSecondary }]}>{selectedCurrency}</Text>
                  </View>
                </View>

                <TextInput
                  style={[
                    createInputStyle(theme),
                    styles.amountInput,
                  ]}
                  placeholder={isAmountInBTC ? "0.00000000" : "0.00"}
                  placeholderTextColor={theme.colors.textSecondary}
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  underlineColorAndroid="transparent"
                />

                {/* Amount conversion display */}
                {!!amount && !!bitcoinPrice && bitcoinPrice > 0 && (() => {
                  const converted = convertAmount(amount, isAmountInBTC);
                  if (!converted || converted === '') return null;
                  const currency = isAmountInBTC ? selectedCurrency : 'BTC';
                  const symbol = isAmountInBTC ? getCurrencySymbol() : '';
                  const displayText = `~ ${symbol}${converted} ${currency}`;
                  if (!displayText || displayText === '~   ') return null;
                  return (
                    <View style={styles.conversionContainer}>
                      <Text style={[styles.conversionText, { color: theme.colors.textSecondary }]}>
                        {displayText}
                      </Text>
                    </View>
                  );
                })()}

                <TouchableOpacity
                  onPress={handleSendMax}
                  style={styles.sendMaxButton}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sendMaxText, { color: theme.colors.primary }]}>Send Max</Text>
                </TouchableOpacity>
              </View>

              {/* Fee Section */}
              <LiquidGlassView variant="thin" intensity={80} style={[
                styles.feeSection,
                styles.glassCard,
                Platform.OS === 'android' && {
                  backgroundColor: theme.colors.surface,
                }
              ]}>
                <View style={styles.feeHeader}>
                  <View style={styles.feeInfo}>
                    <ArrowUpRight color={theme.colors.primary} size={20} />
                    <Text style={[styles.feeLabel, { color: theme.colors.text }]}>Transaction Fee</Text>
                  </View>
                  <View style={styles.feeDetails}>
                    <Text style={[styles.feeTime, { color: theme.colors.textSecondary }]}>{getTimeEstimateForFeeRate(feeRate)}</Text>
                    <Text style={[styles.feeAmount, { color: theme.colors.textSecondary }]}>
                      {feeRate} sat/vB
                    </Text>
                  </View>
                </View>

                <View style={styles.feeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.feeButton,
                      {
                        backgroundColor: selectedFeeType === 'slow' ? theme.colors.primary : theme.colors.surface,
                        borderColor: selectedFeeType === 'slow' ? theme.colors.primary : theme.colors.border,
                        borderWidth: 2,
                      }
                    ]}
                    onPress={() => {
                      handleFeePresetChange('slow');
                      setFeeRate(feeEstimates?.economyFee || 1);
                    }}
                  >
                    <Text style={[
                      styles.feeButtonText,
                      { color: selectedFeeType === 'slow' ? 'white' : theme.colors.text }
                    ]}>Slow</Text>
                    <Text style={[styles.feeButtonSubtext, { color: selectedFeeType === 'slow' ? 'white' : theme.colors.textSecondary }]}>
                      {(feeEstimates?.economyFee || 1)} sat/vB
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.feeButton,
                      {
                        backgroundColor: selectedFeeType === 'normal' ? theme.colors.primary : theme.colors.surface,
                        borderColor: selectedFeeType === 'normal' ? theme.colors.primary : theme.colors.border,
                        borderWidth: 2,
                      }
                    ]}
                    onPress={() => {
                      handleFeePresetChange('normal');
                      setFeeRate(feeEstimates?.halfHourFee || 5);
                    }}
                  >
                    <Text style={[
                      styles.feeButtonText,
                      { color: selectedFeeType === 'normal' ? 'white' : theme.colors.text }
                    ]}>Normal</Text>
                    <Text style={[styles.feeButtonSubtext, { color: selectedFeeType === 'normal' ? 'white' : theme.colors.textSecondary }]}>
                      {(feeEstimates?.halfHourFee || 5)} sat/vB
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.feeButton,
                      {
                        backgroundColor: selectedFeeType === 'fast' ? theme.colors.primary : theme.colors.surface,
                        borderColor: selectedFeeType === 'fast' ? theme.colors.primary : theme.colors.border,
                        borderWidth: 2,
                      }
                    ]}
                    onPress={() => {
                      handleFeePresetChange('fast');
                      setFeeRate(feeEstimates?.fastestFee || 15);
                    }}
                  >
                    <Text style={[
                      styles.feeButtonText,
                      { color: selectedFeeType === 'fast' ? 'white' : theme.colors.text }
                    ]}>Fast</Text>
                    <Text style={[styles.feeButtonSubtext, { color: selectedFeeType === 'fast' ? 'white' : theme.colors.textSecondary }]}>
                      {(feeEstimates?.fastestFee || 15)} sat/vB
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.feeButton,
                      {
                        backgroundColor: selectedFeeType === 'custom' ? theme.colors.primary : theme.colors.surface,
                        borderColor: selectedFeeType === 'custom' ? theme.colors.primary : theme.colors.border,
                        borderWidth: 2,
                      }
                    ]}
                    onPress={() => {
                      // Switch to custom fee type
                      handleFeePresetChange('custom');

                      // If no valid custom rate is entered, use the stored custom fee rate from settings
                      if (!customFeeRate || isNaN(parseFloat(customFeeRate)) || parseFloat(customFeeRate) <= 0) {
                        const fallbackRate = feeSettings?.customFeeRate || 10;
                        const maxRate = (feeSettings && feeSettings.maxFeeRate) ? feeSettings.maxFeeRate : 100;

                        // Use the smaller of fallback rate or max allowed rate
                        const finalRate = Math.min(fallbackRate, maxRate);
                        setFeeRate(finalRate);
                        // Update custom fee rate through wallet store
                        handleCustomFeeRateChange(finalRate.toString());
                        setCustomFeeValidation({ isValid: true, message: 'Valid fee rate' });
                      }
                      // If customFeeRate is already set and valid, the onChangeText handler will handle the validation
                    }}
                  >
                    <Text style={[
                      styles.feeButtonText,
                      { color: selectedFeeType === 'custom' ? 'white' : theme.colors.text }
                    ]}>Custom</Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Fee Input */}
                {selectedFeeType === 'custom' && (
                  <>
                    <View style={styles.customFeeContainer}>
                      <TextInput
                        style={[
                          createInputStyle(theme, 'fun'),
                          styles.customFeeInput,
                        ]}
                        placeholder="Enter custom fee rate"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={customFeeRate}
                        onChangeText={(text) => {
                          // Always update customFeeRate to keep the input responsive
                          handleCustomFeeRateChange(text);

                          // Only update feeRate if we're currently in custom mode
                          if (selectedFeeType === 'custom') {
                            const rate = parseFloat(text);
                            const maxRate = (feeSettings && feeSettings.maxFeeRate) ? feeSettings.maxFeeRate : 100;

                            // Validate input and update validation state
                            if (!text.trim()) {
                              // Empty input - clear validation state and reset fee rate to default
                              setCustomFeeValidation({ isValid: true, message: null });
                              // Reset to the stored custom fee rate from settings as fallback
                              const fallbackRate = feeSettings?.customFeeRate || 10;
                              setFeeRate(fallbackRate);
                            } else if (isNaN(rate) || rate <= 0) {
                              // Invalid format
                              setCustomFeeValidation({
                                isValid: false,
                                message: 'Please enter a valid fee rate'
                              });
                            } else if (rate > maxRate) {
                              // Exceeds maximum
                              setCustomFeeValidation({
                                isValid: false,
                                message: `Maximum allowed: ${maxRate} sat/vB`
                              });
                            } else {
                              // Valid rate
                              setCustomFeeValidation({
                                isValid: true,
                                message: 'Valid fee rate'
                              });
                            }

                            // Always update feeRate to match the displayed value
                            // This ensures consistency between UI and actual transaction
                            if (!isNaN(rate) && rate > 0) {
                              setFeeRate(rate);
                            }

                            // User interaction handled by handleCustomFeeRateChange
                          }
                        }}
                        keyboardType="numeric"
                        underlineColorAndroid="transparent"
                      />
                      <Text style={[styles.customFeeUnit, { color: theme.colors.textSecondary }]}>sat/vB</Text>
                    </View>

                    {/* Custom Fee Validation Feedback */}
                    {customFeeValidation.message && (
                      <View style={styles.validationContainer}>
                        {customFeeValidation.isValid ? (
                          <View style={styles.validationRow}>
                            <CheckCircle color={theme.colors.success} size={16} />
                            <Text style={[styles.validationText, { color: theme.colors.success }]}>
                              {customFeeValidation.message}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.validationRow}>
                            <AlertCircle color={theme.colors.error} size={16} />
                            <Text style={[styles.validationText, { color: theme.colors.error }]}>
                              {customFeeValidation.message}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}

                {estimatedFee !== null && estimatedFee > 0 && (
                  <View style={styles.feeEstimate}>
                    <Text style={[styles.feeEstimateText, { color: theme.colors.textSecondary }]}>
                      Estimated fee: {estimatedFee.toFixed(8)} BTC{bitcoinPrice && bitcoinPrice > 0 ? ` (${getCurrencySymbol()}${(estimatedFee * bitcoinPrice).toFixed(2)})` : ''}
                    </Text>
                  </View>
                )}

                {/* Transaction Fee Educational Section */}
                <View style={[styles.feeEducationCard, { backgroundColor: theme.colors.primary + '05' }]}>
                  <View style={styles.feeEducationHeader}>
                    <View style={[styles.feeEducationIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                      <ArrowUpRight color={theme.colors.primary} size={18} />
                    </View>
                    <Text style={[styles.feeEducationTitle, { color: theme.colors.text }]}>
                      Understanding Bitcoin Transaction Fees
                    </Text>
                  </View>
                  <Text style={[styles.feeEducationDescription, { color: theme.colors.textSecondary }]}>
                    Bitcoin transaction fees compensate miners for processing your transaction and securing the network:
                  </Text>
                  <View style={styles.feeEducationPoints}>
                    <Text style={[styles.feeEducationPoint, { color: theme.colors.textSecondary }]}>
                      • <Text style={{ fontWeight: '600' }}>Fee Rate:</Text> Measured in satoshis per virtual byte (sat/vB)
                    </Text>
                    <Text style={[styles.feeEducationPoint, { color: theme.colors.textSecondary }]}>
                      • <Text style={{ fontWeight: '600' }}>Higher Fees:</Text> Faster confirmation (5-20 minutes)
                    </Text>
                    <Text style={[styles.feeEducationPoint, { color: theme.colors.textSecondary }]}>
                      • <Text style={{ fontWeight: '600' }}>Lower Fees:</Text> Slower confirmation (1-6+ hours)
                    </Text>
                    <Text style={[styles.feeEducationPoint, { color: theme.colors.textSecondary }]}>
                      • <Text style={{ fontWeight: '600' }}>Network Congestion:</Text> Fees change based on demand
                    </Text>
                  </View>
                </View>
              </LiquidGlassView>

              {/* RBF Toggle */}
              <LiquidGlassView variant="thin" intensity={75} style={[
                styles.rbfSection,
                styles.glassCard,
                Platform.OS === 'android' && {
                  backgroundColor: theme.colors.surface,
                }
              ]}>
                <View style={styles.rbfInfo}>
                  <Text style={[styles.rbfLabel, { color: theme.colors.text }]}>Enable RBF</Text>
                  <Text style={[styles.rbfDescription, { color: theme.colors.textSecondary }]}>Replace-by-fee allows you to increase the fee later</Text>
                </View>
                <ThemedSwitch
                  value={enableRBF}
                  onValueChange={handleRBFChange}
                  theme={theme}
                  testID="rbf-toggle"
                />
              </LiquidGlassView>

              {/* Coin Control */}
              <LiquidGlassView variant="thin" intensity={75} style={[
                styles.coinControlCard,
                Platform.OS === 'android' && {
                  backgroundColor: theme.colors.surface,
                }
              ]}>
                <TouchableOpacity
                  style={styles.coinControlSection}
                  onPress={() => {
                    router.push('/coin-control');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.coinControlLeft}>
                    <View style={[styles.coinControlIcon, {
                      backgroundColor: selectedUtxoIds.length > 0 ? theme.colors.primary + '20' : theme.colors.textSecondary + '15'
                    }]}>
                      <Coins
                        color={selectedUtxoIds.length > 0 ? theme.colors.primary : theme.colors.textSecondary}
                        size={20}
                      />
                    </View>
                    <View style={styles.coinControlTextContainer}>
                      <Text style={[styles.coinControlLabel, { color: theme.colors.text }]}>
                        Coin Control
                      </Text>
                      <Text style={[styles.coinControlSubtitle, { color: theme.colors.textSecondary }]}>
                        {selectedUtxoIds.length > 0
                          ? `${selectedUtxoIds.length} coin${selectedUtxoIds.length !== 1 ? 's' : ''} selected`
                          : 'Manual UTXO selection'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.coinControlRight}>
                    <Text style={[styles.coinControlAction, { color: theme.colors.primary }]}>
                      {selectedUtxoIds.length > 0 ? 'Edit' : 'Select'}
                    </Text>
                    <ChevronRight color={theme.colors.textSecondary} size={20} />
                  </View>
                </TouchableOpacity>
              </LiquidGlassView>

              {/* Review Button */}
              <TouchableOpacity
                style={[
                  createButtonStyle(theme, 'primary'),
                  styles.reviewButton,
                  (!recipientAddress || !amount || isLoading || !addressValidation.isValid) && {
                    ...styles.reviewButtonDisabled,
                    backgroundColor: theme.isDark ? theme.colors.surfaceDark : theme.colors.border
                  }
                ]}
                onPress={handleReviewTransaction}
                disabled={!recipientAddress || !amount || isLoading || !addressValidation.isValid}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.reviewButtonText,
                  (!recipientAddress || !amount || isLoading || !addressValidation.isValid) && styles.reviewButtonTextDisabled
                ]}>
                  {isLoading ? 'Broadcasting Transaction...' : 'Review & Send Bitcoin'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>

        {/* QR Scanner Modal */}
        <Modal
          visible={showQRScanner}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <QRScanner
            onScan={handleQRScan}
            onClose={() => setShowQRScanner(false)}
          />
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    // Add sufficient bottom padding to prevent content from going under tab bar
    // iOS tab bar height (~49pt) + safe area (~34pt) + spacing = ~100pt
    paddingBottom: platformStyles.tabBarBottomPadding,
  },
  content: {
    paddingHorizontal: platformStyles.spacing.xl,
    paddingTop: platformStyles.spacing.xl,
  },

  inputSection: {
    marginBottom: platformStyles.spacing.xl,
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: platformStyles.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: platformStyles.borderRadius.large,
    padding: platformStyles.spacing.lg,
    fontSize: 17,
    minHeight: 56,
    paddingRight: 50, // Add padding to avoid text overlap
  },
  qrCodeButton: {
    position: 'absolute',
    right: platformStyles.spacing.md,
    top: platformStyles.spacing.lg,
    padding: 4,
  },
  addressInputOptions: {
    flexDirection: 'row',
    marginBottom: platformStyles.spacing.md,
  },
  addressOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.medium,
    gap: 8,
  },
  addressOptionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.md,
  },
  currencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 15,
    marginHorizontal: 8,
  },
  amountInput: {
    borderWidth: 1.5,
    borderRadius: platformStyles.borderRadius.large,
    padding: platformStyles.spacing.lg,
    fontSize: 19,
    fontWeight: '500',
    marginBottom: 8,
  },
  sendMaxButton: {
    paddingVertical: platformStyles.spacing.sm,
    paddingHorizontal: platformStyles.spacing.md,
    alignSelf: 'flex-end',
    borderRadius: platformStyles.borderRadius.medium,
  },
  sendMaxText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
  },
  feeSection: {
    marginBottom: platformStyles.spacing.xl,
    padding: platformStyles.spacing.xl,
    borderRadius: platformStyles.borderRadius.xl,
    ...platformStyles.shadow,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.lg,
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  feeDetails: {
    alignItems: 'flex-end',
  },
  feeTime: {
    fontSize: 15,
  },
  feeAmount: {
    fontSize: 15,
    marginTop: 2,
  },
  feeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: platformStyles.spacing.md,
    gap: 8,
  },
  feeButton: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: 6,
    borderRadius: platformStyles.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    ...platformStyles.shadow,
  },
  feeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  customFeeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.lg,
    paddingVertical: platformStyles.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: platformStyles.borderRadius.medium,
  },
  customFeeInput: {
    flex: 1,
    marginRight: 8,
  },
  customFeeUnit: {
    fontSize: 15,
    fontWeight: '500',
  },
  feeButtonSubtext: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  feeButtonTime: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  feeEstimate: {
    alignItems: 'center',
    paddingTop: 8,
  },
  feeEstimateText: {
    fontSize: 15,
    fontStyle: 'italic',
  },
  rbfSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.xl,
    padding: platformStyles.spacing.xl,
    borderRadius: platformStyles.borderRadius.xl,
    ...platformStyles.shadow,
  },
  rbfInfo: {
    flex: 1,
    marginRight: platformStyles.spacing.lg,
  },
  rbfLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  rbfDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  coinControlCard: {
    marginBottom: platformStyles.spacing.xxl,
    borderRadius: platformStyles.borderRadius.xxl,
    overflow: 'hidden',
    ...platformStyles.cardShadow,
  },
  coinControlSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.lg,
    paddingHorizontal: platformStyles.spacing.xl,
  },
  coinControlLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coinControlIcon: {
    width: 44,
    height: 44,
    borderRadius: platformStyles.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.md,
  },
  coinControlTextContainer: {
    flex: 1,
  },
  coinControlLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  coinControlSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  coinControlRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinControlAction: {
    fontSize: 15,
    fontWeight: '600',
  },
  reviewButton: {
    marginTop: platformStyles.spacing.xl,
    marginBottom: platformStyles.spacing.xxxl,
    paddingVertical: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.large,
    alignItems: 'center',
    ...platformStyles.buttonShadow,
  },
  reviewButtonDisabled: {
    // backgroundColor will be set dynamically via theme.colors.border
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.5,
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 19,
    fontWeight: '600',
  },
  reviewButtonTextDisabled: {
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: platformStyles.spacing.huge,
  },
  emptyTitle: {
    fontSize: 30, // Increased from 26
    fontWeight: '800', // Increased weight
    marginBottom: 12, // Increased from 10
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 18, // Increased from 17
    textAlign: 'center',
    lineHeight: 28, // Increased from 26
    marginBottom: platformStyles.spacing.huge, // Increased from xxxl
    letterSpacing: 0.2,
  },
  setupButton: {
    paddingHorizontal: platformStyles.spacing.huge, // Increased from xxxl
    paddingVertical: platformStyles.spacing.lg + 4, // Increased
    borderRadius: platformStyles.borderRadius.xxl, // Increased from large
  },
  setupButtonText: {
    color: 'white',
    fontSize: 18, // Increased from 17
    fontWeight: '700', // Increased from 600
    letterSpacing: 0.3,
  },
  validationContainer: {
    marginTop: 8,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  validationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  conversionContainer: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  conversionText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  autoAdjustmentCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    ...platformStyles.shadow,
  },
  autoAdjustmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  autoAdjustmentIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  autoAdjustmentTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  autoAdjustmentReason: {
    fontSize: 13,
    marginBottom: 2,
    lineHeight: 18,
  },
  autoAdjustmentDetails: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  feeEducationCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
    ...(Platform.OS === 'ios' && platformStyles.shadow),
  },
  feeEducationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeEducationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  feeEducationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  feeEducationDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  feeEducationPoints: {
    marginTop: 4,
  },
  feeEducationPoint: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 2,
  },
  glassCard: {
    borderRadius: platformStyles.borderRadius.xxl,
    overflow: 'hidden',
  },
});
