import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import { feeEstimationService } from '@/services/fee-service';
import { cancelTransaction, performRBF, validateRBFTransaction } from '@/services/rbf-service';
import { Transaction } from '@/types/wallet';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type FeeOption = {
  label: string;
  rate: number;
  time?: string;
};

export default function FeeBumpScreen() {
  const { txid, mode } = useLocalSearchParams<{ txid: string; mode?: 'rbf' | 'cpfp' }>();
  const { theme, transactions, currentWallet, feeSettings } = useWallet();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [feeOptions, setFeeOptions] = useState<FeeOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('Fast');
  const [customFeeRate, setCustomFeeRate] = useState<string>('');
  const [debouncedFeeRate, setDebouncedFeeRate] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isBumpingFee, setIsBumpingFee] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [canReplace, setCanReplace] = useState<boolean>(false);
  const isCPFPMode = (mode || 'rbf') === 'cpfp';
  const [defaultFastRate, setDefaultFastRate] = useState<number>(25);

  useEffect(() => {
    if (txid && transactions) {
      const tx = transactions.find((t: Transaction) => t.txid === txid);
      setTransaction(tx || null);
    }
  }, [txid, transactions]);

  // Debounce the fee rate used for CPFP validation to avoid re-validating on every keystroke
  useEffect(() => {
    const currentRate = (() => {
      if (selectedOption === 'Custom') {
        return parseInt(customFeeRate || '0') || 0;
      }
      const opt = feeOptions.find(o => o.label === selectedOption);
      return opt?.rate || 0;
    })();

    const handle = setTimeout(() => {
      setDebouncedFeeRate(currentRate);
    }, 400);

    return () => clearTimeout(handle);
  }, [selectedOption, customFeeRate, feeOptions]);

  // Validate capability for RBF mode (does not depend on fee rate)
  useEffect(() => {
    const runRbfValidation = async () => {
    if (!transaction || !currentWallet || isCPFPMode) {
        return;
      }

      setIsValidating(true);
      setValidationError(null);
      setCanReplace(false);

    if (transaction.rbfEligible === false) {
        setValidationError('This transaction is not eligible for RBF fee bumping from this wallet.');
        setIsValidating(false);
        return;
      }

      try {
        const validation = await validateRBFTransaction(transaction.txid, currentWallet.addresses);
        if (!validation.isValid || !validation.canReplace) {
          setValidationError(validation.reason || 'Transaction cannot be replaced');
          setCanReplace(false);
        } else {
          setCanReplace(true);
        }
      } catch (error) {
        console.error('Bump validation failed:', error);
        setValidationError(error instanceof Error ? error.message : 'Validation failed');
        setCanReplace(false);
      } finally {
        setIsValidating(false);
      }
    };

    runRbfValidation();
  }, [transaction, currentWallet, isCPFPMode]);

  // Validate capability for CPFP mode (depends on debounced fee rate)
  useEffect(() => {
    const runCpfpValidation = async () => {
    if (!transaction || !currentWallet || !isCPFPMode) {
        return;
      }

      setIsValidating(true);
      setValidationError(null);
      setCanReplace(false);

    if (transaction.cpfpEligible === false) {
        setValidationError('This transaction is not eligible for CPFP fee bumping from this wallet.');
        setIsValidating(false);
        return;
      }

      try {
        // Gate by CPFP toggle
        if (!feeSettings?.enableCPFP) {
          setValidationError('CPFP is disabled in settings');
          setCanReplace(false);
        } else {
          const { validateCPFPTransaction } = await import('@/services/cpfp-service');
          const effectiveRate = debouncedFeeRate > 0 ? debouncedFeeRate : defaultFastRate;
          const validation = await validateCPFPTransaction(transaction.txid, currentWallet.addresses, {
            targetFeeRate: effectiveRate,
            maxChildFee: feeSettings?.cpfpMaxChildFee,
            includeUnconfirmed: feeSettings?.cpfpIncludeUnconfirmed,
          });
          if (!validation.isValid || !validation.canCPFP) {
            setValidationError(validation.reason || 'Transaction cannot be bumped with CPFP');
            setCanReplace(false);
          } else {
            setCanReplace(true);
          }
        }
      } catch (error) {
        console.error('Bump validation failed:', error);
        setValidationError(error instanceof Error ? error.message : 'Validation failed');
        setCanReplace(false);
      } finally {
        setIsValidating(false);
      }
    };

    runCpfpValidation();
  }, [transaction, currentWallet, isCPFPMode, debouncedFeeRate, feeSettings, defaultFastRate]);

  useEffect(() => {
    const loadFeeEstimates = async () => {
      setIsLoading(true);
      try {
        // Use stable API to avoid runtime shape mismatches
        const estimates = await feeEstimationService.getFeeEstimates();
        const options: FeeOption[] = [
          { label: 'Fast', rate: estimates.fastestFee, time: '~5-15 min' },
          { label: 'Medium', rate: estimates.halfHourFee, time: '~20-45 min' },
          { label: 'Slow', rate: estimates.hourFee, time: '~45-90 min' },
        ];
        setFeeOptions(options);
        setCustomFeeRate(String(estimates.fastestFee));
        setDefaultFastRate(estimates.fastestFee);
      } catch (error) {
        console.error('Failed to load fee estimates:', error);
        const fallbackOptions: FeeOption[] = [
          { label: 'Fast', rate: 25, time: '~5-15 min' },
          { label: 'Medium', rate: 15, time: '~20-45 min' },
          { label: 'Slow', rate: 10, time: '~45-90 min' },
        ];
        setFeeOptions(fallbackOptions);
        setCustomFeeRate('25');
        setDefaultFastRate(25);
      } finally {
        setIsLoading(false);
      }
    };
    loadFeeEstimates();
  }, []);

    if (!transaction) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <Stack.Screen 
          options={{ 
            title: 'Bump Fee (RBF)',
            headerBackTitle: '',
            headerStyle: {
              backgroundColor: 'transparent',
            },
            headerTintColor: theme.colors.text,
            headerTitleStyle: {
              color: theme.colors.text,
            },
          }} 
        />
        <AndroidSafeContainer style={styles.container}>
          <View style={styles.centerContent}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              Transaction not found
            </Text>
          </View>
        </AndroidSafeContainer>
      </GradientBackground>
    );
  }

  const getCurrentFeeRate = () => {
    if (selectedOption === 'Custom') {
      return parseInt(customFeeRate) || 0;
    }
    const option = feeOptions.find(opt => opt.label === selectedOption);
    return option?.rate || 0;
  };

  const getMinimumFeeRate = () => {
    if (isCPFPMode) return 1; // CPFP does not require beating original rate
    return (transaction.feeRate || 1) + 1; // RBF requires higher than current fee rate
  };

  const isValidFeeRate = () => {
    const currentRate = getCurrentFeeRate();
    const minRate = getMinimumFeeRate();
    
    // RBF requires minimum higher than original fee rate
    if (!isCPFPMode && currentRate < minRate) {
      return false;
    }

    // General positive check
    if (currentRate <= 0) return false;

    // Only apply maxFeeRate validation to custom fee inputs, not preset options
    if (selectedOption === 'Custom') {
      const maxRate = feeSettings?.maxFeeRate;
      if (maxRate !== undefined && maxRate !== null && maxRate > 0 && currentRate > maxRate) {
        return false;
      }
    }
    return true;
  };

  const handleCreateRBF = async () => {
    if (!isValidFeeRate()) {
      const currentRate = getCurrentFeeRate();
      const minRate = getMinimumFeeRate();
      
      let errorMessage = '';
      if (!isCPFPMode && currentRate < minRate) {
        errorMessage = `The fee rate must be higher than ${minRate} sat/vB for RBF`;
      } else if (selectedOption === 'Custom') {
        const maxRate = feeSettings?.maxFeeRate;
        if (maxRate !== undefined && maxRate !== null && maxRate > 0 && currentRate > maxRate) {
          errorMessage = `Fee rate cannot exceed ${maxRate} sat/vB (your maximum fee rate setting)`;
        }
      }
      
      Alert.alert('Invalid Fee Rate', errorMessage);
      return;
    }

    if (!canReplace) {
      Alert.alert(
        isCPFPMode ? 'Cannot Bump with CPFP' : 'Cannot Replace Transaction',
        validationError || (isCPFPMode ? 'This transaction cannot be bumped with CPFP' : 'This transaction cannot be replaced')
      );
      return;
    }

    if (!currentWallet) {
      Alert.alert('Error', 'No wallet selected');
      return;
    }

    setIsBumpingFee(true);
    try {
      const newFeeRate = getCurrentFeeRate();
      console.log('Starting bump process...', isCPFPMode ? 'CPFP' : 'RBF');
      console.log('Original TXID:', transaction?.txid);
      console.log('New fee rate:', newFeeRate, 'sat/vB');

      if (isCPFPMode) {
        const { performCPFP } = await import('@/services/cpfp-service');
        const result = await performCPFP(
          transaction!.txid,
          currentWallet.mnemonic,
          currentWallet.addresses,
          {
            targetFeeRate: newFeeRate,
            maxChildFee: feeSettings?.cpfpMaxChildFee,
            includeUnconfirmed: feeSettings?.cpfpIncludeUnconfirmed,
          }
        );
        if (result.success) {
          Alert.alert(
            'CPFP Transaction Created',
            `The child transaction has been created and broadcast to the network.\n\nChild TXID: ${result.childTxid}`,
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]
          );
        } else {
          Alert.alert('CPFP Failed', result.error || 'Failed to create CPFP transaction. Please try again.');
        }
      } else {
        const result = await performRBF(
          transaction!.txid,
          newFeeRate,
          currentWallet.mnemonic,
          currentWallet.addresses
        );
        if (result.success) {
          Alert.alert(
            'RBF Transaction Created',
            `The replacement transaction has been created and broadcast to the network.\n\nReplacement TXID: ${result.replacementTxid}`,
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]
          );
        } else {
          Alert.alert('RBF Failed', result.error || 'Failed to create replacement transaction. Please try again.');
        }
      }
    } catch (error) {
      console.error('Bump failed:', error);
      Alert.alert('Error', `Failed to bump transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsBumpingFee(false);
    }
  };

  const handleCancelTransaction = async () => {
    if (!canReplace) {
      Alert.alert(
        'Cannot Cancel Transaction',
        validationError || 'This transaction cannot be cancelled'
      );
      return;
    }

    if (!currentWallet) {
      Alert.alert('Error', 'No wallet selected');
      return;
    }

    Alert.alert(
      'Cancel Transaction',
      'This will create a replacement transaction that sends the funds back to your wallet, effectively canceling the original transaction. The cancellation fee will be deducted from the returned amount.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              console.log('Starting transaction cancellation...');
              console.log('Original TXID:', transaction?.txid);
              
              const result = await cancelTransaction(
                transaction!.txid,
                currentWallet.mnemonic,
                currentWallet.addresses
              );
              
              if (result.success) {
                Alert.alert(
                  'Transaction Cancelled',
                  `The transaction has been successfully cancelled.\n\nCancellation TXID: ${result.cancellationTxid}\n\nThe funds have been returned to your wallet (minus the cancellation fee).`,
                  [
                    {
                      text: 'OK',
                      onPress: () => router.back(),
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Cancellation Failed',
                  result.error || 'Failed to cancel transaction. Please try again.'
                );
              }
            } catch (error) {
              console.error('Transaction cancellation failed:', error);
              Alert.alert(
                'Error', 
                `Failed to cancel transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
              );
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <Stack.Screen 
        options={{ 
          title: isCPFPMode ? 'Bump Fee (CPFP)' : 'Bump Fee (RBF)',
          headerBackTitle: '',
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            color: theme.colors.text,
          },
        }} 
      />
      
      <AndroidSafeContainer style={styles.container}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === 'ios' && { paddingTop: 75 }
          ]}
          showsVerticalScrollIndicator={false}
        >
        {/* Transaction Info */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.transactionInfo}>
            <View style={[
              styles.amountCircle,
              { backgroundColor: theme.colors.primary + '20' }
            ]}>
              <Text style={[styles.amountText, { color: theme.colors.primary }]}>
                {transaction.amount.toFixed(0)}
              </Text>
              <Text style={[styles.amountUnit, { color: theme.colors.primary }]}>
                sats
              </Text>
            </View>
            
            <View style={styles.checkIcon}>
              <Check color={theme.colors.primary} size={24} />
            </View>
            
            <Text style={[styles.confirmationsText, { color: theme.colors.textSecondary }]}>
              {transaction.confirmations || 0} confirmations
            </Text>
          </View>
        </View>

        {/* Educational Section (RBF vs CPFP) */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.rbfEducationHeader}>
            <View style={[styles.rbfEducationIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.rbfEducationEmoji, { color: theme.colors.primary }]}>🔄</Text>
            </View>
            <Text style={[styles.rbfEducationTitle, { color: theme.colors.text }]}>
              {isCPFPMode ? 'How Child-Pays-for-Parent (CPFP) Works' : 'How Replace-by-Fee (RBF) Works'}
            </Text>
          </View>
          <Text style={[styles.rbfEducationDescription, { color: theme.colors.textSecondary }]}>
            {isCPFPMode
              ? 'CPFP creates a new child transaction that spends the unconfirmed parent outputs with a higher fee, increasing the combined (parent + child) effective fee rate.'
              : 'RBF replaces your unconfirmed transaction with a new one paying a higher fee. This helps when your transaction is taking longer than expected to confirm.'}
          </Text>
          {!isCPFPMode && (
            <View style={styles.rbfEducationNote}>
              <Text style={[styles.rbfEducationNoteText, { color: theme.colors.textSecondary }]}>💡 <Text style={{ fontWeight: '600' }}>Tip:</Text> You can also cancel a transaction by sending the money back to yourself</Text>
            </View>
          )}
        </View>
          
        {/* RBF Validation Status */}
        {isValidating && (
          <View style={styles.validationStatus}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <Text style={[styles.validationText, { color: theme.colors.textSecondary }]}>
              {isCPFPMode ? 'Validating CPFP capability...' : 'Validating RBF capability...'}
            </Text>
          </View>
        )}
        
        {!isValidating && validationError && (
          <View style={styles.validationStatus}>
            <Text style={[styles.validationError, { color: theme.colors.error }]}>
              ⚠️ {validationError}
            </Text>
          </View>
        )}
        
        {!isValidating && canReplace && !validationError && (
          <View style={styles.validationStatus}>
            <Text style={[styles.validationSuccess, { color: theme.colors.success }]}>
              ✅ Transaction can be replaced with higher fee
            </Text>
          </View>
        )}

        {/* Fee Suggestions */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Suggestions
          </Text>
          
          {isLoading ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            feeOptions.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.feeOption,
                  selectedOption === option.label && {
                    backgroundColor: theme.colors.primary + '10',
                    borderColor: theme.colors.primary,
                  }
                ]}
                onPress={() => {
                  setSelectedOption(option.label);
                  setCustomFeeRate(option.rate.toString());
                }}
              >
                <View style={styles.feeOptionContent}>
                  <Text style={[styles.feeOptionLabel, { color: theme.colors.text }]}>
                    {option.label}
                  </Text>
                  {option.time && (
                    <Text style={[styles.feeOptionTime, { color: theme.colors.textSecondary }]}>
                      {option.time}
                    </Text>
                  )}
                </View>
                
                <View style={styles.feeOptionRight}>
                  <Text style={[styles.feeOptionRate, { color: theme.colors.textSecondary }]}>
                    {option.rate} sat/b
                  </Text>
                  {selectedOption === option.label && (
                    <Check color={theme.colors.primary} size={20} />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
          
          {/* Custom Fee Option */}
          <TouchableOpacity
            style={[
              styles.feeOption,
              selectedOption === 'Custom' && {
                backgroundColor: theme.colors.primary + '10',
                borderColor: theme.colors.primary,
              }
            ]}
            onPress={() => setSelectedOption('Custom')}
          >
            <View style={styles.feeOptionContent}>
              <Text style={[styles.feeOptionLabel, { color: theme.colors.text }]}>
                Custom
              </Text>
            </View>
            
            <View style={styles.customFeeContainer}>
              <TextInput
                style={[
                  styles.customFeeInput,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  }
                ]}
                value={customFeeRate}
                onChangeText={(text) => {
                  setCustomFeeRate(text);
                  setSelectedOption('Custom');
                }}
                placeholder="2"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={[styles.customFeeUnit, { color: theme.colors.textSecondary }]}>
                sat/b
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Custom Fee Validation Feedback */}
          {selectedOption === 'Custom' && customFeeRate && (
            <View style={styles.validationContainer}>
              {(() => {
                const rate = parseInt(customFeeRate);
                const minRate = getMinimumFeeRate();
                const maxRate = feeSettings?.maxFeeRate;
                
                if (isNaN(rate) || rate <= 0) {
                  return (
                    <Text style={[styles.validationText, { color: theme.colors.error }]}>
                      Please enter a valid fee rate
                    </Text>
                  );
                } else if (!isCPFPMode && rate < minRate) {
                  return (
                    <Text style={[styles.validationText, { color: theme.colors.error }]}>
                      Must be higher than {minRate} sat/vB for RBF
                    </Text>
                  );
                } else if (maxRate !== undefined && maxRate !== null && maxRate > 0 && rate > maxRate) {
                  return (
                    <Text style={[styles.validationText, { color: theme.colors.error }]}>
                      Cannot exceed {maxRate} sat/vB (your maximum fee rate setting)
                    </Text>
                  );
                } else {
                  return (
                    <Text style={[styles.validationText, { color: theme.colors.success }]}>
                      Valid fee rate
                    </Text>
                  );
                }
              })()}
            </View>
          )}
          
          <Text style={[styles.feeHint, { color: theme.colors.textSecondary }]}>
            {isCPFPMode
              ? 'Choose a fee rate that keeps the combined parent + child fee competitive. Higher rates increase the chance of confirming both transactions together.'
              : `The total fee rate (satoshi per byte) you want to pay should be higher than ${getMinimumFeeRate()} sat/byte`}
          </Text>
        </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={[styles.bottomActions, { backgroundColor: theme.colors.surface + 'F0', borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.bumpButton,
            { backgroundColor: theme.colors.primary },
            (!isValidFeeRate() || !canReplace || isValidating || isBumpingFee || isCancelling) && { opacity: 0.5 }
          ]}
          onPress={handleCreateRBF}
          disabled={!isValidFeeRate() || !canReplace || isValidating || isBumpingFee || isCancelling}
        >
          {isBumpingFee ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.bumpButtonText}>Bump Fee</Text>
          )}
        </TouchableOpacity>
        
        {!isCPFPMode && (
          <TouchableOpacity
            style={[
              styles.cancelButton,
              (!canReplace || isValidating || isBumpingFee || isCancelling) && { opacity: 0.5 }
            ]}
            onPress={handleCancelTransaction}
            disabled={!canReplace || isValidating || isBumpingFee || isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator color={theme.colors.error} size="small" />
            ) : (
              <Text style={[styles.cancelButtonText, { color: theme.colors.error }]}>Cancel Transaction</Text>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.detailsButton}>
          <Text style={[styles.detailsButtonText, { color: theme.colors.textSecondary }]}>
            details
          </Text>
        </TouchableOpacity>
        </View>
      </AndroidSafeContainer>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...platformStyles.typography.bodyLarge,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: platformStyles.spacing.lg,
    marginVertical: platformStyles.spacing.md,
    padding: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.large,
    ...platformStyles.shadow,
  },
  transactionInfo: {
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.xl,
  },
  amountCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.lg,
  },
  amountText: {
    ...platformStyles.typography.heading,
    fontSize: 32,
    fontWeight: 'bold',
  },
  amountUnit: {
    ...platformStyles.typography.body,
    fontSize: 16,
  },
  checkIcon: {
    marginBottom: platformStyles.spacing.sm,
  },
  confirmationsText: {
    ...platformStyles.typography.body,
  },
  description: {
    ...platformStyles.typography.body,
    lineHeight: 22,
    textAlign: 'left',
  },
  rbfEducationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.md,
  },
  rbfEducationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.md,
  },
  rbfEducationEmoji: {
    fontSize: 16,
  },
  rbfEducationTitle: {
    ...platformStyles.typography.title,
    fontSize: 18,
  },
  rbfEducationDescription: {
    ...platformStyles.typography.body,
    lineHeight: 22,
    marginBottom: platformStyles.spacing.md,
  },
  rbfEducationSteps: {
    marginBottom: platformStyles.spacing.md,
  },
  rbfEducationStep: {
    ...platformStyles.typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: platformStyles.spacing.xs,
  },
  rbfEducationNote: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: platformStyles.spacing.md,
    borderRadius: platformStyles.borderRadius.medium,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  rbfEducationNoteText: {
    ...platformStyles.typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  validationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: platformStyles.spacing.md,
    paddingVertical: platformStyles.spacing.sm,
  },
  sectionTitle: {
    ...platformStyles.typography.title,
    marginBottom: platformStyles.spacing.lg,
  },
  feeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.medium,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: platformStyles.spacing.sm,
  },
  feeOptionContent: {
    flex: 1,
  },
  feeOptionLabel: {
    ...platformStyles.typography.bodyLarge,
    fontWeight: '600',
    marginBottom: 2,
  },
  feeOptionTime: {
    ...platformStyles.typography.caption,
  },
  feeOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: platformStyles.spacing.sm,
  },
  feeOptionRate: {
    ...platformStyles.typography.body,
  },
  customFeeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: platformStyles.spacing.sm,
  },
  customFeeInput: {
    borderWidth: 1,
    borderRadius: platformStyles.borderRadius.small,
    paddingHorizontal: platformStyles.spacing.md,
    paddingVertical: platformStyles.spacing.sm,
    minWidth: 60,
    textAlign: 'center',
    ...platformStyles.typography.body,
  },
  customFeeUnit: {
    ...platformStyles.typography.body,
  },
  validationContainer: {
    marginTop: platformStyles.spacing.sm,
    paddingHorizontal: platformStyles.spacing.sm,
  },
  validationText: {
    ...platformStyles.typography.caption,
    fontSize: 12,
    fontWeight: '500',
  },
  validationError: {
    ...platformStyles.typography.body,
    fontSize: 14,
    fontWeight: '500',
  },
  validationSuccess: {
    ...platformStyles.typography.body,
    fontSize: 14,
    fontWeight: '500',
  },
  feeHint: {
    ...platformStyles.typography.caption,
    marginTop: platformStyles.spacing.md,
    lineHeight: 18,
  },
  bottomActions: {
    padding: platformStyles.spacing.lg,
    paddingBottom: platformStyles.spacing.xl,
    borderTopWidth: 1,
    borderRadius: platformStyles.borderRadius.large,
    marginTop: platformStyles.spacing.sm,
  },
  actionButton: {
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.xl,
    borderRadius: platformStyles.borderRadius.medium,
    alignItems: 'center',
    marginBottom: platformStyles.spacing.md,
  },
  bumpButton: {
    // Styles for bump fee button
  },
  bumpButtonText: {
    color: 'white',
    ...platformStyles.typography.bodyLarge,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: platformStyles.spacing.md,
    alignItems: 'center',
    marginBottom: platformStyles.spacing.sm,
  },
  cancelButtonText: {
    ...platformStyles.typography.bodyLarge,
    fontWeight: '600',
  },
  detailsButton: {
    paddingVertical: platformStyles.spacing.sm,
    alignItems: 'center',
  },
  detailsButtonText: {
    ...platformStyles.typography.body,
  },
});