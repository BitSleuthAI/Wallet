import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import { feeEstimationService } from '@/services/fee-service';
import { performRBF, validateRBFTransaction } from '@/services/rbf-service';
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
  const { txid } = useLocalSearchParams<{ txid: string }>();
  const { theme, transactions, currentWallet } = useWallet();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [feeOptions, setFeeOptions] = useState<FeeOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('Fast');
  const [customFeeRate, setCustomFeeRate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [canReplace, setCanReplace] = useState<boolean>(false);

  useEffect(() => {
    if (txid && transactions) {
      const tx = transactions.find((t: Transaction) => t.txid === txid);
      setTransaction(tx || null);
    }
  }, [txid, transactions]);

  // Validate RBF capability when transaction is loaded
  useEffect(() => {
    const validateRBF = async () => {
      if (!transaction || !currentWallet) {
        return;
      }

      setIsValidating(true);
      setValidationError(null);
      setCanReplace(false);

      try {
        const validation = await validateRBFTransaction(transaction.txid, currentWallet.addresses);
        
        if (!validation.isValid || !validation.canReplace) {
          setValidationError(validation.reason || 'Transaction cannot be replaced');
          setCanReplace(false);
        } else {
          setCanReplace(true);
        }
      } catch (error) {
        console.error('RBF validation failed:', error);
        setValidationError(error instanceof Error ? error.message : 'Validation failed');
        setCanReplace(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateRBF();
  }, [transaction, currentWallet]);

  useEffect(() => {
    const loadFeeEstimates = async () => {
      setIsLoading(true);
      try {
        const fees = await feeEstimationService.getFeeEstimates();
        const options: FeeOption[] = [
          { label: 'Fast', rate: fees.fastestFee, time: '~10 min' },
          { label: 'Medium', rate: fees.halfHourFee, time: '~30 min' },
          { label: 'Slow', rate: fees.hourFee, time: '~1 hour' },
        ];
        setFeeOptions(options);
        setCustomFeeRate(fees.fastestFee.toString());
      } catch (error) {
        console.error('Failed to load fee estimates:', error);
        const fallbackOptions: FeeOption[] = [
          { label: 'Fast', rate: 165, time: '~10 min' },
          { label: 'Medium', rate: 150, time: '~30 min' },
          { label: 'Slow', rate: 150, time: '~1 hour' },
        ];
        setFeeOptions(fallbackOptions);
        setCustomFeeRate('165');
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
    return (transaction.feeRate || 1) + 1; // Must be higher than current fee rate
  };

  const isValidFeeRate = () => {
    const currentRate = getCurrentFeeRate();
    const minRate = getMinimumFeeRate();
    return currentRate >= minRate;
  };

  const handleCreateRBF = async () => {
    if (!isValidFeeRate()) {
      Alert.alert(
        'Invalid Fee Rate',
        `The fee rate must be higher than ${getMinimumFeeRate()} sat/byte`
      );
      return;
    }

    if (!canReplace) {
      Alert.alert(
        'Cannot Replace Transaction',
        validationError || 'This transaction cannot be replaced'
      );
      return;
    }

    if (!currentWallet) {
      Alert.alert('Error', 'No wallet selected');
      return;
    }

    setIsCreating(true);
    try {
      const newFeeRate = getCurrentFeeRate();
      
      console.log('Starting RBF process...');
      console.log('Original TXID:', transaction?.txid);
      console.log('New fee rate:', newFeeRate, 'sat/vB');
      
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
        Alert.alert(
          'RBF Failed',
          result.error || 'Failed to create replacement transaction. Please try again.'
        );
      }
    } catch (error) {
      console.error('RBF failed:', error);
      Alert.alert(
        'Error', 
        `Failed to create replacement transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelTransaction = () => {
    Alert.alert(
      'Cancel Transaction',
      'This will create a replacement transaction that sends the funds back to your wallet, effectively canceling the original transaction.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Cancel',
          style: 'destructive',
          onPress: () => {
            // Implement transaction cancellation logic
            Alert.alert('Feature Coming Soon', 'Transaction cancellation will be available in a future update.');
          },
        },
      ]
    );
  };

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

        {/* Description */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            We will replace this transaction with the one with a higher fee, so it should be mined faster. This is called RBF - Replace By Fee.
          </Text>
          
          {/* RBF Validation Status */}
          {isValidating && (
            <View style={styles.validationStatus}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <Text style={[styles.validationText, { color: theme.colors.textSecondary }]}>
                Validating RBF capability...
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
        </View>

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
          
          <Text style={[styles.feeHint, { color: theme.colors.textSecondary }]}>
            The total fee rate (satoshi per byte) you want to pay should be higher than {getMinimumFeeRate()} sat/byte
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
            (!isValidFeeRate() || !canReplace || isValidating || isCreating) && { opacity: 0.5 }
          ]}
          onPress={handleCreateRBF}
          disabled={!isValidFeeRate() || !canReplace || isValidating || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.bumpButtonText}>Bump Fee</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelTransaction}
        >
          <Text style={[styles.cancelButtonText, { color: theme.colors.error }]}>
            Cancel Transaction
          </Text>
        </TouchableOpacity>
        
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
  validationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: platformStyles.spacing.md,
    paddingVertical: platformStyles.spacing.sm,
  },
  validationText: {
    ...platformStyles.typography.body,
    marginLeft: platformStyles.spacing.sm,
  },
  validationError: {
    ...platformStyles.typography.body,
    fontWeight: '500',
  },
  validationSuccess: {
    ...platformStyles.typography.body,
    fontWeight: '500',
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