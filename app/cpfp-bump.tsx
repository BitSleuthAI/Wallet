import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { useWallet } from '@/hooks/wallet-store';
import { CPFPOptions, CPFPRecommendation } from '@/types/wallet';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    DollarSign,
    Info,
    RefreshCw,
    TrendingUp,
    Zap,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function CPFPBumpScreen() {
  const { txid } = useLocalSearchParams<{ txid: string }>();
  const { theme, transactions, currentWallet, feeSettings } = useWallet();
  const [loading, setLoading] = useState<boolean>(true);
  const [validating, setValidating] = useState<boolean>(false);
  const [bumping, setBumping] = useState<boolean>(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<CPFPRecommendation | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  // CPFP Options
  const [targetFeeRate, setTargetFeeRate] = useState<string>('15');
  const [maxChildFee, setMaxChildFee] = useState<string>('10000');
  const [includeUnconfirmed, setIncludeUnconfirmed] = useState<boolean>(true);
  const [customOutputs, setCustomOutputs] = useState<Array<{ address: string; amount: number }>>([]);
  const [sendToSelf, setSendToSelf] = useState<boolean>(true);

  useEffect(() => {
    if (txid && transactions) {
      const tx = transactions.find((t: any) => t.txid === txid);
      setTransaction(tx || null);
      if (tx) {
        loadRecommendations(tx);
      }
    }
  }, [txid, transactions]);

  const loadRecommendations = async (tx?: any) => {
    const targetTransaction = tx || transaction;
    if (!targetTransaction || !currentWallet) return;
    
    setLoading(true);
    try {
      console.log('📊 Loading CPFP recommendations...');
      const { getCPFPRecommendations } = await import('@/services/cpfp-service');
      const rec = await getCPFPRecommendations(targetTransaction.txid, currentWallet.addresses);
      setRecommendation(rec);
      
      if (rec) {
        setTargetFeeRate(rec.recommendedFeeRate.toString());
      }
    } catch (error) {
      console.error('❌ Failed to load CPFP recommendations:', error);
      Alert.alert('Error', 'Failed to load CPFP recommendations');
    } finally {
      setLoading(false);
    }
  };

  const validateCPFP = async () => {
    if (!transaction || !currentWallet) return;
    
    setValidating(true);
    try {
      console.log('🔍 Validating CPFP transaction...');
      const { validateCPFPTransaction } = await import('@/services/cpfp-service');
      
      const options: CPFPOptions = {
        targetFeeRate: parseInt(targetFeeRate) || 15,
        maxChildFee: parseInt(maxChildFee) || 10000,
        includeUnconfirmed,
        customOutputs: customOutputs.length > 0 ? customOutputs : undefined,
      };
      
      const result = await validateCPFPTransaction(transaction.txid, currentWallet.addresses, options);
      setValidationResult(result);
      
      if (!result.isValid || !result.canCPFP) {
        Alert.alert('CPFP Not Available', result.reason || 'Cannot perform CPFP on this transaction');
      }
    } catch (error) {
      console.error('❌ CPFP validation failed:', error);
      Alert.alert('Error', 'Failed to validate CPFP transaction');
    } finally {
      setValidating(false);
    }
  };

  const performCPFP = async () => {
    if (!transaction || !currentWallet || !validationResult?.isValid) return;
    
    // Validate fee rate against user's maximum setting
    const feeRate = parseInt(targetFeeRate) || 15;
    const maxRate = (feeSettings && feeSettings.maxFeeRate) ? feeSettings.maxFeeRate : 100;
    
    if (feeRate > maxRate) {
      Alert.alert(
        'Fee Rate Too High',
        `Target fee rate cannot exceed ${maxRate} sat/vB (your maximum fee rate setting)`
      );
      return;
    }
    
    setBumping(true);
    try {
      console.log('🔄 Performing CPFP...');
      const { performCPFP } = await import('@/services/cpfp-service');
      
      const options: CPFPOptions = {
        targetFeeRate: feeRate,
        maxChildFee: parseInt(maxChildFee) || 10000,
        includeUnconfirmed,
        customOutputs: customOutputs.length > 0 ? customOutputs : undefined,
      };
      
      const result = await performCPFP(
        transaction.txid,
        currentWallet.mnemonic,
        currentWallet.addresses,
        options
      );
      
      if (result.success) {
        Alert.alert(
          'CPFP Successful',
          `Child transaction broadcasted successfully!\n\nChild TXID: ${result.childTxid}`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('CPFP Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('❌ CPFP failed:', error);
      Alert.alert('Error', 'Failed to perform CPFP');
    } finally {
      setBumping(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const FeePresetCard = ({ 
    title, 
    feeRate, 
    timeEstimate, 
    description, 
    icon: Icon 
  }: {
    title: string;
    feeRate: number;
    timeEstimate: string;
    description: string;
    icon: any;
  }) => {
    const isSelected = parseInt(targetFeeRate) === feeRate;

    return (
      <TouchableOpacity
        style={[
          styles.presetCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={() => setTargetFeeRate(feeRate.toString())}
      >
        <View style={styles.presetHeader}>
          <View style={[styles.presetIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Icon color={theme.colors.primary} size={20} />
          </View>
          <View style={styles.presetInfo}>
            <Text style={[styles.presetTitle, { color: theme.colors.text }]}>
              {title}
            </Text>
            <Text style={[styles.presetTime, { color: theme.colors.textSecondary }]}>
              {timeEstimate}
            </Text>
          </View>
          {isSelected && (
            <CheckCircle color={theme.colors.primary} size={20} />
          )}
        </View>
        
        <Text style={[styles.presetDescription, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
        
        <View style={styles.presetStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Fee Rate
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {feeRate} sat/vB
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Est. Child Fee
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {validationResult?.estimatedChildFee || 0} sats
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <AndroidSafeContainer style={styles.container}>
          <Stack.Screen 
            options={{ 
              headerShown: false,
            }} 
          />
          
          {/* Custom Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              testID="back-button"
            >
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              CPFP Fee Bump
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading CPFP recommendations...
            </Text>
          </View>
        </AndroidSafeContainer>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <AndroidSafeContainer style={styles.container}>
        <Stack.Screen 
          options={{ 
            headerShown: false,
          }} 
        />
        
        {/* Custom Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            testID="back-button"
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            CPFP Fee Bump
          </Text>
          <TouchableOpacity
            onPress={() => loadRecommendations(transaction)}
            disabled={loading}
            style={styles.refreshButton}
          >
            <RefreshCw 
              color={theme.colors.primary} 
              size={20} 
              style={loading ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scrollView}>
          {/* Transaction Info */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Parent Transaction
            </Text>
            <View style={styles.transactionInfo}>
              <Text style={[styles.transactionId, { color: theme.colors.textSecondary }]}>
                {transaction?.txid?.substring(0, 20)}...
              </Text>
              <Text style={[styles.transactionAmount, { color: theme.colors.text }]}>
                +{transaction?.amount?.toFixed(8)} BTC
              </Text>
            </View>
          </View>

          {/* CPFP Explanation */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.explanationHeader}>
              <View style={[styles.explanationIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Info color={theme.colors.primary} size={20} />
              </View>
              <Text style={[styles.explanationTitle, { color: theme.colors.text }]}>
                How CPFP Works
              </Text>
            </View>
            <Text style={[styles.explanationText, { color: theme.colors.textSecondary }]}>
              Child-Pays-for-Parent (CPFP) allows you to bump the fee of a received transaction by creating a child transaction that spends its outputs. The child transaction pays a higher fee, effectively increasing the priority of the parent transaction.
            </Text>
          </View>

          {/* Fee Rate Selection */}
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Target Fee Rate
          </Text>
          
          <FeePresetCard 
            title="Economy" 
            feeRate={5} 
            timeEstimate="2-6 hours"
            description="Lowest cost, slower confirmation"
            icon={Clock}
          />
          
          <FeePresetCard 
            title="Standard" 
            feeRate={15} 
            timeEstimate="30-60 min"
            description="Balanced cost and speed"
            icon={Zap}
          />
          
          <FeePresetCard 
            title="Priority" 
            feeRate={25} 
            timeEstimate="10-20 min"
            description="Fastest confirmation, higher cost"
            icon={TrendingUp}
          />

          {/* Custom Fee Rate */}
          <View style={[styles.customFeeCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.customFeeHeader}>
              <View style={[styles.presetIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <DollarSign color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.presetInfo}>
                <Text style={[styles.presetTitle, { color: theme.colors.text }]}>
                  Custom Fee Rate
                </Text>
                <Text style={[styles.presetTime, { color: theme.colors.textSecondary }]}>
                  Set your own rate
                </Text>
              </View>
            </View>
            
            <View style={styles.customFeeInput}>
              <TextInput
                style={[
                  styles.feeInput,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={targetFeeRate}
                onChangeText={setTargetFeeRate}
                placeholder="Enter fee rate"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={[styles.feeUnit, { color: theme.colors.textSecondary }]}>
                sat/vB
              </Text>
            </View>
            
            {/* Fee Rate Validation Feedback */}
            {targetFeeRate && (
              <View style={styles.validationContainer}>
                {(() => {
                  const rate = parseInt(targetFeeRate);
                  const maxRate = (feeSettings && feeSettings.maxFeeRate) ? feeSettings.maxFeeRate : 100;
                  
                  if (isNaN(rate) || rate <= 0) {
                    return (
                      <Text style={[styles.validationText, { color: theme.colors.error }]}>
                        Please enter a valid fee rate
                      </Text>
                    );
                  } else if (rate > maxRate) {
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
          </View>

          {/* CPFP Options */}
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            CPFP Options
          </Text>

          <View style={[styles.optionsCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                Maximum Child Fee
              </Text>
              <View style={styles.optionInput}>
                <TextInput
                  style={[
                    styles.smallInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  value={maxChildFee}
                  onChangeText={setMaxChildFee}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <Text style={[styles.inputUnit, { color: theme.colors.textSecondary }]}>
                  sats
                </Text>
              </View>
            </View>

            <View style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                Include Unconfirmed Coins
              </Text>
              {Platform.OS === 'web' ? (
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: includeUnconfirmed }}
                  onPress={() => setIncludeUnconfirmed(!includeUnconfirmed)}
                  style={[
                    styles.webSwitch,
                    {
                      backgroundColor: includeUnconfirmed ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.webSwitchThumb,
                      {
                        transform: [{ translateX: includeUnconfirmed ? 24 : 2 }],
                        backgroundColor: '#FFFFFF',
                      },
                    ]}
                  />
                </Pressable>
              ) : (
                <Switch
                  value={includeUnconfirmed}
                  onValueChange={setIncludeUnconfirmed}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                  ios_backgroundColor={theme.colors.border}
                />
              )}
            </View>

            <View style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                Send to Self
              </Text>
              {Platform.OS === 'web' ? (
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: sendToSelf }}
                  onPress={() => setSendToSelf(!sendToSelf)}
                  style={[
                    styles.webSwitch,
                    {
                      backgroundColor: sendToSelf ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.webSwitchThumb,
                      {
                        transform: [{ translateX: sendToSelf ? 24 : 2 }],
                        backgroundColor: '#FFFFFF',
                      },
                    ]}
                  />
                </Pressable>
              ) : (
                <Switch
                  value={sendToSelf}
                  onValueChange={setSendToSelf}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                  ios_backgroundColor={theme.colors.border}
                />
              )}
            </View>
          </View>

          {/* Validation Results */}
          {validationResult && (
            <View style={[styles.validationCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.validationTitle, { color: theme.colors.text }]}>
                Validation Results
              </Text>
              <View style={styles.validationRow}>
                <Text style={[styles.validationLabel, { color: theme.colors.textSecondary }]}>
                  Can CPFP:
                </Text>
                <Text style={[
                  styles.validationValue, 
                  { color: validationResult.canCPFP ? theme.colors.success : theme.colors.error }
                ]}>
                  {validationResult.canCPFP ? 'Yes' : 'No'}
                </Text>
              </View>
              {validationResult.estimatedChildFee && (
                <View style={styles.validationRow}>
                  <Text style={[styles.validationLabel, { color: theme.colors.textSecondary }]}>
                    Estimated Child Fee:
                  </Text>
                  <Text style={[styles.validationValue, { color: theme.colors.text }]}>
                    {validationResult.estimatedChildFee} sats
                  </Text>
                </View>
              )}
              {validationResult.effectiveFeeRate && (
                <View style={styles.validationRow}>
                  <Text style={[styles.validationLabel, { color: theme.colors.textSecondary }]}>
                    Effective Fee Rate:
                  </Text>
                  <Text style={[styles.validationValue, { color: theme.colors.text }]}>
                    {validationResult.effectiveFeeRate.toFixed(2)} sat/vB
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
              ]}
              onPress={validateCPFP}
              disabled={validating}
            >
              {validating ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <CheckCircle color={theme.colors.primary} size={20} />
              )}
              <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
                {validating ? 'Validating...' : 'Validate CPFP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.success, borderColor: theme.colors.success }
              ]}
              onPress={performCPFP}
              disabled={bumping || !validationResult?.canCPFP}
            >
              {bumping ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Zap color="white" size={20} />
              )}
              <Text style={[styles.actionButtonText, { color: 'white' }]}>
                {bumping ? 'Bumping Fee...' : 'Bump Fee with CPFP'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </AndroidSafeContainer>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  headerSpacer: {
    width: 32,
  },
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  transactionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionId: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  explanationIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  presetCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  presetIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  presetInfo: {
    flex: 1,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  presetTime: {
    fontSize: 14,
    marginTop: 2,
  },
  presetDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  presetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  customFeeCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  customFeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customFeeInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginRight: 8,
  },
  feeUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionsCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  optionInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallInput: {
    width: 80,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'center',
    marginRight: 8,
  },
  inputUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  validationContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  validationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  webSwitch: {
    width: 48,
    height: 28,
    borderRadius: 9999,
    justifyContent: 'center',
  },
  webSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1.5,
  },
  validationCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  validationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  validationLabel: {
    fontSize: 14,
  },
  validationValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
