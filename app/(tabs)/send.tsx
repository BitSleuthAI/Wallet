import { GradientBackground } from '@/components/GradientBackground';
import QRScanner from '@/components/QRScanner';
import WalletSelector from '@/components/WalletSelector';
import { createButtonStyle, createInputStyle, platformStyles } from '@/constants/themes';
import { useAutoLock } from '@/hooks/auto-lock-store';
import { useTabAnimation } from '@/hooks/use-tab-animation';
import { useWallet } from '@/hooks/wallet-store';
import { getAddressUTXOs, isValidBitcoinAddress, sendTransaction } from '@/services/bitcoin-service';
import { feeEstimationService } from '@/services/fee-service';
import { Stack, router } from 'expo-router';
import { AlertCircle, ArrowUpRight, CheckCircle, QrCode } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SendScreen() {
  const { animatedStyle } = useTabAnimation(1); // Send tab = index 1
  const { 
    currentWallet, 
    balance, 
    theme, 
    coinControl,
    selectedCurrency,
    getCurrencySymbol,
    bitcoinPrice: walletBitcoinPrice,
    feeSettings,
    feeSettingsLoading,
  } = useWallet();
  const { authenticateForTransaction, authenticateForTransactionEnhanced, isEnhancedSecurityRequired } = useAutoLock();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isAmountInBTC, setIsAmountInBTC] = useState(true);
  const [feeRate, setFeeRate] = useState(5);
  const [customFeeRate, setCustomFeeRate] = useState('10');
  const [selectedFeeType, setSelectedFeeType] = useState<'slow' | 'normal' | 'fast' | 'custom'>('normal');
  const [enableRBF, setEnableRBF] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  // Use Bitcoin price from wallet store (already converted to selected currency)
  const bitcoinPrice = walletBitcoinPrice?.usd || null;
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
  const [availableUtxos, setAvailableUtxos] = useState<any[]>([]);
  const [userHasInteractedWithFees, setUserHasInteractedWithFees] = useState(false);
  const [lastAppliedFeeSettings, setLastAppliedFeeSettings] = useState<string | null>(null);
  const [lastFeeEstimates, setLastFeeEstimates] = useState<any>(null);
  const [customFeeValidation, setCustomFeeValidation] = useState<{
    isValid: boolean;
    message: string | null;
  }>({ isValid: true, message: null });

  // Reset user interaction state only when component mounts
  useEffect(() => {
    setUserHasInteractedWithFees(false);
  }, []);

  // Track fee settings changes but preserve user's manual fee selections
  // This prevents the fee management effect from overriding user-selected rates when settings change
  useEffect(() => {
    if (feeSettings) {
      // Only track preset and custom fee rate changes, not RBF (which doesn't affect fee rates)
      const settingsKey = `${feeSettings.defaultPreset}-${feeSettings.customFeeRate}`;
      if (lastAppliedFeeSettings !== settingsKey) {
        // Only reset user interaction on initial load (when lastAppliedFeeSettings is null)
        // or when preset/custom fee rate actually changes (not RBF or other settings)
        if (lastAppliedFeeSettings === null) {
          // Initial load - reset user interaction to allow default settings
          setUserHasInteractedWithFees(false);
        } else {
          // Settings actually changed - only reset if it's a fee-related change
          setUserHasInteractedWithFees(false);
        }
        setLastAppliedFeeSettings(settingsKey);
      }
    }
  }, [feeSettings, lastAppliedFeeSettings]);

  // Load fee estimates on component mount and wallet change
  useEffect(() => {
    const loadFeeEstimates = async () => {
      try {
        const fees = await feeEstimationService.getFeeEstimates().catch(() => null);
        setFeeEstimates(fees);
        setLastFeeEstimates(fees);
        
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

  // Initial fee settings application - only runs once when settings first load
  useEffect(() => {
    if (feeSettingsLoading || !feeSettings || userHasInteractedWithFees) return;

    // Apply fee settings only on initial load or when settings change
    const presetType = feeSettings.defaultPreset === 'economy' ? 'slow' : 
                      feeSettings.defaultPreset === 'standard' ? 'normal' : 
                      feeSettings.defaultPreset === 'priority' ? 'fast' : 'custom';
    setSelectedFeeType(presetType);
    setCustomFeeRate(feeSettings.customFeeRate.toString());
    setEnableRBF(feeSettings.enableRBF);
  }, [feeSettings, feeSettingsLoading, userHasInteractedWithFees]);

  // Fee rate updates - handles both initial load and network estimate updates
  useEffect(() => {
    if (feeSettingsLoading || !feeSettings) return;

    // Only update fee rates if user hasn't manually interacted with fees
    // This preserves user's manual fee selections while allowing automatic updates for new users
    if (userHasInteractedWithFees) {
      return; // Don't override user's manual selections
    }

    // Update fee rates based on current preset only when user hasn't interacted
    if (feeSettings.defaultPreset === 'custom') {
      // For custom preset, use the stored custom fee rate
      setFeeRate(feeSettings.customFeeRate);
    } else if (feeEstimates && feeEstimates.economyFee && feeEstimates.halfHourFee && feeEstimates.fastestFee) {
      // Use network estimates when available
      const presetFee = feeSettings.defaultPreset === 'economy' ? feeEstimates.economyFee :
                       feeSettings.defaultPreset === 'standard' ? feeEstimates.halfHourFee :
                       feeSettings.defaultPreset === 'priority' ? feeEstimates.fastestFee :
                       feeEstimates.halfHourFee;
      setFeeRate(presetFee);
    } else {
      // Use fallback rates when estimates aren't available
      const fallbackRate = feeSettings.defaultPreset === 'economy' ? 1 :
                         feeSettings.defaultPreset === 'standard' ? 5 :
                         feeSettings.defaultPreset === 'priority' ? 15 :
                         feeSettings.customFeeRate;
      setFeeRate(fallbackRate);
    }
  }, [feeSettings, feeSettingsLoading, feeEstimates, userHasInteractedWithFees]);

  useEffect(() => {
    const fetchUtxos = async () => {
      try {
        if (!currentWallet) return;
        const all: any[] = [];
        for (let i = 0; i < currentWallet.addresses.length; i++) {
          const addr = currentWallet.addresses[i];
          const list = await getAddressUTXOs(addr, i);
          list.forEach((u: any) => all.push({ ...u, address: addr }));
        }
        setAvailableUtxos(all);
      } catch (e) {
        console.warn('Failed to fetch UTXOs', e);
      }
    };
    fetchUtxos();
  }, [currentWallet]);

  useEffect(() => {
    const ids = coinControl.getSelectedUtxoIds();
    setSelectedUtxoIds(ids);
  }, [coinControl]);

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
      } catch (error) {
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

  const handleSendMax = () => {
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
  };

  const handleQRScan = (data: string) => {
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
  };

  const convertAmount = (value: string, fromBTC: boolean): string => {
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
    } catch (error) {
      return '';
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const toggleCurrency = () => {
    if (amount && bitcoinPrice && bitcoinPrice > 0) {
      const convertedAmount = convertAmount(amount, isAmountInBTC);
      if (convertedAmount) {
        setAmount(convertedAmount);
      }
    }
    setIsAmountInBTC(!isAmountInBTC);
  };

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

      // Check if enhanced security is required for this transaction
      const enhancedSecurityRequired = await isEnhancedSecurityRequired(amountInBTC);
      
      // Request appropriate level of authentication
      let authResult: boolean;
      if (enhancedSecurityRequired) {
        console.log('🔐 Enhanced security required for transaction amount:', amountInBTC, 'BTC');
        authResult = await authenticateForTransactionEnhanced(amountInBTC, true);
      } else {
        console.log('🔐 Standard biometric authentication for transaction');
        authResult = await authenticateForTransaction();
      }

      if (!authResult) {
        const authMessage = enhancedSecurityRequired 
          ? 'Enhanced security authentication is required for this transaction. Please ensure your security key is accessible and try again.'
          : 'Biometric authentication is required to send transactions.';
        Alert.alert(
          'Authentication Required',
          authMessage,
          [{ text: 'OK' }]
        );
        return;
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
      const dustLimit = 0.00000546; // 546 satoshis
      if (amountInBTC < dustLimit) {
        const dustLimitText = dustLimit.toString();
        const errorMessage = `Amount too small. Minimum amount is ${dustLimitText} BTC`;
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
              const truncatedAddress = recipientAddress.substring(0, 20) + '...';
        console.log('Transaction details:', {
          from: currentWallet?.name,
          to: truncatedAddress,
          amount: amountInBTC,
          feeRate,
          enableRBF,
          network: 'mainnet',
          enhancedSecurity: enhancedSecurityRequired
        });
      
      // Send the real transaction
      const selected = availableUtxos.filter(u => selectedUtxoIds.includes(`${u.txid}:${u.vout}`));
      
      // Validate wallet addresses and current index
      if (!currentWallet.addresses || currentWallet.addresses.length === 0) {
        throw new Error('No addresses available in wallet');
      }
      
      if (currentWallet.currentAddressIndex < 0 || currentWallet.currentAddressIndex >= currentWallet.addresses.length) {
        throw new Error('Invalid current address index');
      }
      
      if (!currentWallet.mnemonic || currentWallet.mnemonic.trim() === '') {
        throw new Error('Wallet mnemonic is required for transaction signing');
      }
      
      // Get the current address and its index for signing
      const currentAddress = currentWallet.addresses[currentWallet.currentAddressIndex];
      const addressIndex = currentWallet.currentAddressIndex;
      
      const result = await sendTransaction(
        currentAddress,
        recipientAddress.trim(),
        amountInBTC,
        feeRate,
        currentWallet.mnemonic,
        addressIndex,
        enableRBF,
        selected.length > 0 ? selected : undefined,
        currentWallet.addresses
      );
      
      console.log('✅ Real Bitcoin transaction sent successfully:', result);
      
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
            
            // Navigate to transaction history
            router.push('/transaction-history');
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
    try {
      // Validate inputs
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
            // Check if enhanced security is required for this transaction
            const amountInBTC = isAmountInBTC ? parseFloat(amount) : (bitcoinPrice && bitcoinPrice > 0 ? parseFloat(amount) / bitcoinPrice : 0);
            const enhancedSecurityRequired = await isEnhancedSecurityRequired(amountInBTC);
            
            // Request appropriate level of authentication
            let authResult: boolean;
            if (enhancedSecurityRequired) {
              console.log('🔐 Enhanced security required for transaction review');
              authResult = await authenticateForTransactionEnhanced(amountInBTC, true);
            } else {
              console.log('🔐 Standard biometric authentication for transaction review');
              authResult = await authenticateForTransaction();
            }

            if (!authResult) {
              const authMessage = enhancedSecurityRequired 
                ? 'Enhanced security authentication is required for this transaction. Please ensure your security key is accessible and try again.'
                : 'Biometric authentication is required to send transactions.';
              Alert.alert(
                'Authentication Required',
                authMessage,
                [{ text: 'OK' }]
              );
              return;
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
  
  const getTimeEstimateForFeeRate = (rate: number): string => {
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
  };

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
                />
                <TouchableOpacity 
                  style={styles.qrCodeButton}
                  onPress={() => setShowQRScanner(true)}
                >
                  <QrCode color={theme.colors.primary} size={24} />
                </TouchableOpacity>
              </View>
              
              {/* Address Validation Indicator */}
              {!!recipientAddress.trim() && !!addressValidation.message && (
                <View style={styles.validationContainer}>
                  {addressValidation.isValid ? (
                    <View style={styles.validationRow}>
                      <CheckCircle color={theme.colors.success || '#10B981'} size={16} />
                      <Text style={[styles.validationText, { color: theme.colors.success || '#10B981' }]}>{addressValidation.message}</Text>
                    </View>
                  ) : (
                    <View style={styles.validationRow}>
                      <AlertCircle color={theme.colors.error || '#EF4444'} size={16} />
                      <Text style={[styles.validationText, { color: theme.colors.error || '#EF4444' }]}>{addressValidation.message}</Text>
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
                  <Switch
                    value={!isAmountInBTC}
                    onValueChange={toggleCurrency}
                    trackColor={{ false: theme.colors.primary, true: theme.colors.textSecondary }}
                    thumbColor="white"
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
              
              <TouchableOpacity onPress={handleSendMax}>
                <Text style={[styles.sendMaxText, { color: theme.colors.primary }]}>Send Max</Text>
              </TouchableOpacity>
            </View>

            {/* Fee Section */}
            <View style={[styles.feeSection, { backgroundColor: theme.colors.surface }]}>
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
                    setSelectedFeeType('slow');
                    setFeeRate(feeEstimates?.economyFee || 1);
                    setUserHasInteractedWithFees(true);
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
                    setSelectedFeeType('normal');
                    setFeeRate(feeEstimates?.halfHourFee || 5);
                    setUserHasInteractedWithFees(true);
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
                    setSelectedFeeType('fast');
                    setFeeRate(feeEstimates?.fastestFee || 15);
                    setUserHasInteractedWithFees(true);
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
                    setSelectedFeeType('custom');
                    
                    // If no valid custom rate is entered, use the stored custom fee rate from settings
                    if (!customFeeRate || isNaN(parseFloat(customFeeRate)) || parseFloat(customFeeRate) <= 0) {
                      const fallbackRate = feeSettings?.customFeeRate || 10;
                      const maxRate = (feeSettings && feeSettings.maxFeeRate) ? feeSettings.maxFeeRate : 100;
                      
                      // Use the smaller of fallback rate or max allowed rate
                      const finalRate = Math.min(fallbackRate, maxRate);
                      setFeeRate(finalRate);
                      setCustomFeeRate(finalRate.toString());
                      setCustomFeeValidation({ isValid: true, message: 'Valid fee rate' });
                    }
                    // If customFeeRate is already set and valid, the onChangeText handler will handle the validation
                    
                    // Mark as user interaction
                    setUserHasInteractedWithFees(true);
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
                      setCustomFeeRate(text);
                      
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
                        
                        // Mark as user interaction
                        setUserHasInteractedWithFees(true);
                      }
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.customFeeUnit, { color: theme.colors.textSecondary }]}>sat/vB</Text>
                </View>
                
                {/* Custom Fee Validation Feedback */}
                {customFeeValidation.message && (
                  <View style={styles.validationContainer}>
                    {customFeeValidation.isValid ? (
                      <View style={styles.validationRow}>
                        <CheckCircle color={theme.colors.success || '#10B981'} size={16} />
                        <Text style={[styles.validationText, { color: theme.colors.success || '#10B981' }]}>
                          {customFeeValidation.message}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.validationRow}>
                        <AlertCircle color={theme.colors.error || '#EF4444'} size={16} />
                        <Text style={[styles.validationText, { color: theme.colors.error || '#EF4444' }]}>
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
            </View>

            {/* RBF Toggle */}
            <View style={[styles.rbfSection, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.rbfInfo}>
                <Text style={[styles.rbfLabel, { color: theme.colors.text }]}>Enable RBF</Text>
                <Text style={[styles.rbfDescription, { color: theme.colors.textSecondary }]}>Replace-by-fee allows you to increase the fee later</Text>
              </View>
              <Switch
                value={enableRBF}
                onValueChange={setEnableRBF}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor="white"
              />
            </View>

            {/* Coin Control */}
            <TouchableOpacity 
              style={[styles.coinControlSection, { backgroundColor: theme.colors.surface }]}
              onPress={() => {
                router.push('/coin-control');
              }}
            >
              <Text style={[styles.coinControlLabel, { color: theme.colors.text }]}>Coin Control</Text>
                              <Text style={[styles.coinControlAction, { color: theme.colors.primary }]}>
                {selectedUtxoIds.length > 0 ? `${selectedUtxoIds.length} selected` : 'Select Coins'}
              </Text>
            </TouchableOpacity>

            {/* Review Button */}
            <TouchableOpacity
              style={[
                createButtonStyle(theme, 'primary'),
                styles.reviewButton,
                { 
                  opacity: (!recipientAddress || !amount || isLoading || !addressValidation.isValid) ? 0.5 : 1
                }
              ]}
              onPress={handleReviewTransaction}
              disabled={!recipientAddress || !amount || isLoading || !addressValidation.isValid}
            >
              <Text style={styles.reviewButtonText}>
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
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 56,
    paddingRight: 50, // Add padding to avoid text overlap
  },
  qrCodeButton: {
    position: 'absolute',
    right: 12,
    top: 16,
    padding: 4,
  },
  addressInputOptions: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  addressOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addressOptionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    marginHorizontal: 8,
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  sendMaxText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  feeSection: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    ...platformStyles.shadow,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  feeDetails: {
    alignItems: 'flex-end',
  },
  feeTime: {
    fontSize: 14,
  },
  feeAmount: {
    fontSize: 14,
    marginTop: 2,
  },
  feeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  feeButton: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...platformStyles.shadow,
  },
  feeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  customFeeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  customFeeInput: {
    flex: 1,
    marginRight: 8,
  },
  customFeeUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  feeButtonSubtext: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  feeButtonTime: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  feeEstimate: {
    alignItems: 'center',
    paddingTop: 8,
  },
  feeEstimateText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  rbfSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    ...platformStyles.shadow,
  },
  rbfInfo: {
    flex: 1,
    marginRight: 16,
  },
  rbfLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rbfDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  coinControlSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 30,
    paddingHorizontal: 20,
    borderRadius: 16,
    ...platformStyles.shadow,
  },
  coinControlLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  coinControlAction: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviewButton: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  setupButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
});