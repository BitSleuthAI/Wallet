import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { useWallet } from '@/hooks/wallet-store';
import { feeEstimationService } from '@/services/fee-service';
import type { FeeEstimate } from '@/types/wallet';
import { Stack, router } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  DollarSign,
  Info,
  RefreshCw,
  Settings,
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

type FeePreset = 'economy' | 'standard' | 'priority' | 'custom';

interface FeeSettings {
  defaultPreset: FeePreset;
  customFeeRate: number;
  enableRBF: boolean;
  enableCPFP: boolean;
  autoAdjustFees: boolean;
  maxFeeRate: number;
  dustThreshold: number;
}

export default function FeeSettingsScreen() {
  const { theme, feeSettings, setFeeSettings } = useWallet();
  const [feeEstimates, setFeeEstimates] = useState<FeeEstimate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // No local state duplication - use feeSettings directly

  useEffect(() => {
    loadFeeEstimates();
  }, []);

  // No sync effects needed - React automatically re-renders when feeSettings changes

  const loadFeeEstimates = async () => {
    try {
      console.log('📊 Loading fee estimates...');
      const estimates = await feeEstimationService.getFeeEstimates();
      setFeeEstimates(estimates);
    } catch (error) {
      console.error('❌ Failed to load fee estimates:', error);
      Alert.alert('Error', 'Failed to load current fee estimates');
    } finally {
      setLoading(false);
    }
  };

  const refreshFeeEstimates = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Refreshing fee estimates...');
      // Force refresh using the new method
      const freshEstimates = await feeEstimationService.refreshFeeEstimates();
      setFeeEstimates(freshEstimates);
    } catch (error) {
      console.error('❌ Failed to refresh fee estimates:', error);
      Alert.alert('Error', 'Failed to refresh fee estimates');
    } finally {
      setRefreshing(false);
    }
  };

  const updateSetting = <K extends keyof FeeSettings>(key: K, value: FeeSettings[K]) => {
    console.log(`🔧 Updating fee setting: ${key} = ${value}`);
    
    // Update wallet store directly
    const newSettings = { ...feeSettings, [key]: value };
    setFeeSettings(newSettings).catch(error => {
      console.error(`❌ Failed to update fee setting ${key}:`, error);
    });
  };

  const getFeePresetInfo = (preset: FeePreset) => {
    if (!feeEstimates) return { rate: 0, time: 'Unknown', description: 'Loading...' };

    switch (preset) {
      case 'economy':
        return {
          rate: feeEstimates.economyFee,
          time: '3-6 hours',
          description: 'Lowest cost, slower confirmation'
        };
      case 'standard':
        return {
          rate: feeEstimates.halfHourFee,
          time: '30-60 min',
          description: 'Balanced cost and speed'
        };
      case 'priority':
        return {
          rate: feeEstimates.fastestFee,
          time: '10-20 min',
          description: 'Fastest confirmation, higher cost'
        };
      case 'custom':
        return {
          rate: feeSettings.customFeeRate,
          time: 'Variable',
          description: 'Set your own fee rate'
        };
      default:
        return { rate: 0, time: 'Unknown', description: 'Unknown preset' };
    }
  };

  const estimateTransactionCost = (feeRate: number) => {
    // Estimate for a typical transaction (2 inputs, 2 outputs)
    const estimatedSize = 250; // bytes (conservative estimate)
    return Math.ceil(feeRate * estimatedSize);
  };

  const FeePresetCard = ({ preset, title, icon: Icon }: {
    preset: FeePreset;
    title: string;
    icon: any;
  }) => {
    const info = getFeePresetInfo(preset);
    const isSelected = feeSettings.defaultPreset === preset;
    const estimatedCost = estimateTransactionCost(info.rate);
    
    return (
      <TouchableOpacity
        style={[
          styles.presetCard,
          {
            backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            borderWidth: isSelected ? 3 : 1,
            shadowColor: isSelected ? theme.colors.primary : 'transparent',
            shadowOffset: isSelected ? { width: 0, height: 4 } : { width: 0, height: 0 },
            shadowOpacity: isSelected ? 0.3 : 0,
            shadowRadius: isSelected ? 8 : 0,
            elevation: isSelected ? 5 : 0,
            transform: isSelected ? [{ scale: 1.02 }] : [{ scale: 1 }],
          },
        ]}
        activeOpacity={0.7}
        onPress={() => {
          console.log(`🔧 Selecting fee preset: ${preset}`);
          console.log(`🔧 Current feeSettings.defaultPreset: ${feeSettings.defaultPreset}`);
          // Update global state directly
          updateSetting('defaultPreset', preset);
        }}
      >
        <View style={styles.presetHeader}>
          <View style={[styles.presetIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Icon color={theme.colors.primary} size={20} />
          </View>
          <View style={styles.presetInfo}>
            <Text style={[styles.presetTitle, { color: isSelected ? '#FFFFFF' : theme.colors.text }]}>
              {title}
            </Text>
            <Text style={[styles.presetTime, { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary }]}>
              {info.time}
            </Text>
          </View>
          {isSelected && (
            <CheckCircle color="#FFFFFF" size={20} />
          )}
        </View>
        
        <Text style={[styles.presetDescription, { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary }]}>
          {info.description}
        </Text>
        
        <View style={styles.presetStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary }]}>
              Fee Rate
            </Text>
            <Text style={[styles.statValue, { color: isSelected ? '#FFFFFF' : theme.colors.text }]}>
              {info.rate} sat/vB
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary }]}>
              Est. Cost
            </Text>
            <Text style={[styles.statValue, { color: isSelected ? '#FFFFFF' : theme.colors.text }]}>
              {estimatedCost} sats
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const SettingToggle = ({ 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    icon: Icon 
  }: {
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: any;
  }) => {
    return (
    <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.settingIcon, { backgroundColor: theme.colors.primary + '20' }]}>
        <Icon color={theme.colors.primary} size={20} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      {Platform.OS === 'web' ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: value }}
          onPress={() => {
            console.log(`🔧 Web switch pressed: ${title}, current value: ${value}, new value: ${!value}`);
            onValueChange(!value);
          }}
          style={[
            styles.webSwitch,
            {
              backgroundColor: value ? theme.colors.primary : theme.colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.webSwitchThumb,
              {
                transform: [{ translateX: value ? 24 : 2 }],
                backgroundColor: '#FFFFFF',
              },
            ]}
          />
        </Pressable>
      ) : (
        <Switch
          value={value}
          onValueChange={(newValue) => {
            console.log(`🔧 Native switch pressed: ${title}, current value: ${value}, new value: ${newValue}`);
            onValueChange(newValue);
          }}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          ios_backgroundColor={theme.colors.border}
        />
      )}
    </View>
  );
  };

  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  const NetworkCongestionIndicator = () => {
    const [congestion, setCongestion] = useState<'low' | 'medium' | 'high'>('medium');
    
    useEffect(() => {
      const checkCongestion = async () => {
        try {
          const level = await feeEstimationService.getNetworkCongestion();
          setCongestion(level);
        } catch (error) {
          console.warn('Failed to get network congestion:', error);
        }
      };
      
      if (feeEstimates) {
        checkCongestion();
      }
    }, [feeEstimates]);
    
    const getCongestionColor = () => {
      switch (congestion) {
        case 'low': return '#10B981'; // Green
        case 'medium': return '#F59E0B'; // Yellow
        case 'high': return '#EF4444'; // Red
        default: return theme.colors.textSecondary;
      }
    };
    
    const getCongestionText = () => {
      switch (congestion) {
        case 'low': return 'Low congestion - Good time to transact';
        case 'medium': return 'Moderate congestion - Normal fees';
        case 'high': return 'High congestion - Consider waiting';
        default: return 'Unknown congestion level';
      }
    };
    
    return (
      <View style={[styles.congestionCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.congestionHeader}>
          <View style={[
            styles.congestionIndicator, 
            { backgroundColor: getCongestionColor() }
          ]} />
          <Text style={[styles.congestionTitle, { color: theme.colors.text }]}>
            Network Status
          </Text>
        </View>
        <Text style={[styles.congestionText, { color: theme.colors.textSecondary }]}>
          {getCongestionText()}
        </Text>
        <Text style={[styles.congestionSubtext, { color: theme.colors.textSecondary }]}>
          Last updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  const handleBack = () => {
    router.back();
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
              Fee Settings
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading fee estimates...
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
            Fee Settings
          </Text>
          <TouchableOpacity
            onPress={refreshFeeEstimates}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            <RefreshCw 
              color={theme.colors.primary} 
              size={20} 
              style={refreshing ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scrollView}>
        {/* Fee Presets Section */}
        <SectionHeader 
          title="Fee Presets" 
          subtitle="Choose your default transaction fee preference"
        />
        
        <FeePresetCard preset="economy" title="Economy" icon={Clock} />
        <FeePresetCard preset="standard" title="Standard" icon={Zap} />
        <FeePresetCard preset="priority" title="Priority" icon={TrendingUp} />
        
        {/* Custom Fee Rate */}
        <View style={[styles.customFeeCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.customFeeHeader}>
            <View style={[styles.presetIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Settings color={theme.colors.primary} size={20} />
            </View>
            <View style={styles.presetInfo}>
              <Text style={[styles.presetTitle, { color: theme.colors.text }]}>
                Custom Fee Rate
              </Text>
              <Text style={[styles.presetTime, { color: theme.colors.textSecondary }]}>
                Set your own rate
              </Text>
            </View>
            {feeSettings.defaultPreset === 'custom' && (
              <CheckCircle color={theme.colors.primary} size={20} />
            )}
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
              value={feeSettings.customFeeRate.toString()}
              onChangeText={(text) => {
                console.log(`🔧 Custom fee rate input: "${text}"`);
                const numericValue = parseInt(text) || 0;
                updateSetting('customFeeRate', numericValue);
                if (feeSettings.defaultPreset !== 'custom') {
                  // Auto-select custom when user types
                  updateSetting('defaultPreset', 'custom');
                }
              }}
              placeholder="Enter fee rate"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <Text style={[styles.feeUnit, { color: theme.colors.textSecondary }]}>
              sat/vB
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.customFeeButton,
              {
                backgroundColor: feeSettings.defaultPreset === 'custom' 
                  ? theme.colors.primary 
                  : 'transparent',
                borderColor: theme.colors.primary,
                borderWidth: feeSettings.defaultPreset === 'custom' ? 3 : 1,
                shadowColor: feeSettings.defaultPreset === 'custom' ? theme.colors.primary : 'transparent',
                shadowOffset: feeSettings.defaultPreset === 'custom' ? { width: 0, height: 4 } : { width: 0, height: 0 },
                shadowOpacity: feeSettings.defaultPreset === 'custom' ? 0.3 : 0,
                shadowRadius: feeSettings.defaultPreset === 'custom' ? 8 : 0,
                elevation: feeSettings.defaultPreset === 'custom' ? 5 : 0,
                transform: feeSettings.defaultPreset === 'custom' ? [{ scale: 1.02 }] : [{ scale: 1 }],
              },
            ]}
            activeOpacity={0.7}
            onPress={() => {
              console.log(`🔧 Using custom fee rate button pressed`);
              // Update wallet store directly to set custom preset
              updateSetting('defaultPreset', 'custom');
            }}
          >
            <Text style={[
              styles.customFeeButtonText,
              { color: feeSettings.defaultPreset === 'custom' ? '#FFFFFF' : theme.colors.primary },
            ]}>
              Use Custom Rate
            </Text>
          </TouchableOpacity>
        </View>

        {/* Advanced Settings */}
        <SectionHeader 
          title="Advanced Settings" 
          subtitle="Configure advanced transaction features"
        />
        
        <SettingToggle
          title="Replace-by-Fee (RBF)"
          subtitle="Allow fee bumping for unconfirmed transactions"
          value={feeSettings.enableRBF}
          onValueChange={(value) => {
            console.log(`🔧 RBF toggle: ${value}`);
            console.log(`🔧 Current feeSettings.enableRBF: ${feeSettings.enableRBF}`);
            updateSetting('enableRBF', value);
          }}
          icon={TrendingUp}
        />
        
        {/* RBF Information Card */}
        {feeSettings.enableRBF && (
          <View style={[styles.rbfInfoCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.rbfInfoHeader}>
              <View style={[styles.rbfInfoIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Info color={theme.colors.primary} size={20} />
              </View>
              <Text style={[styles.rbfInfoTitle, { color: theme.colors.text }]}>
                How RBF Works
              </Text>
            </View>
            <Text style={[styles.rbfInfoText, { color: theme.colors.textSecondary }]}>
              Replace-by-Fee allows you to replace an unconfirmed transaction with a new one paying a higher fee rate. This helps when your transaction is taking longer than expected to confirm.
            </Text>
            <View style={styles.rbfInfoFeatures}>
              <Text style={[styles.rbfInfoFeature, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Must be enabled:</Text> The original transaction must support RBF
              </Text>
              <Text style={[styles.rbfInfoFeature, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Replace, don&apos;t duplicate:</Text> Cancels the old transaction
              </Text>
              <Text style={[styles.rbfInfoFeature, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Higher fee required:</Text> New fee rate must be higher
              </Text>
              <Text style={[styles.rbfInfoFeature, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Same outputs:</Text> Receiving address stays the same
              </Text>
              <Text style={[styles.rbfInfoFeature, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Quick action:</Text> Works immediately on pending transactions
              </Text>
            </View>
          </View>
        )}
        
        <SettingToggle
          title="Child-Pays-for-Parent (CPFP)"
          subtitle="Enable CPFP fee bumping for received transactions"
          value={feeSettings.enableCPFP}
          onValueChange={(value) => {
            console.log(`🔧 CPFP toggle: ${value}`);
            updateSetting('enableCPFP', value);
          }}
          icon={DollarSign}
        />
        
        {/* CPFP Information Card */}
        {feeSettings.enableCPFP && (
          <View style={[styles.cpfpInfoCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cpfpInfoHeader}>
              <View style={[styles.cpfpInfoIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Info color={theme.colors.primary} size={20} />
              </View>
              <Text style={[styles.cpfpInfoTitle, { color: theme.colors.text }]}>
                How CPFP Works
              </Text>
            </View>
            <Text style={[styles.cpfpInfoText, { color: theme.colors.textSecondary }]}>
              CPFP allows you to bump the fee of a received transaction by creating a child transaction that spends its outputs. The child transaction pays a higher fee, effectively increasing the priority of the parent transaction.
            </Text>
            <View style={styles.cpfpInfoFeatures}>
              <Text style={[styles.cpfpInfoFeature, { color: theme.colors.textSecondary }]}>
                • Works with any received transaction
              </Text>
              <Text style={[styles.cpfpInfoFeature, { color: theme.colors.textSecondary }]}>
                • No need for RBF on the original transaction
              </Text>
              <Text style={[styles.cpfpInfoFeature, { color: theme.colors.textSecondary }]}>
                • Effective fee rate combines parent + child fees
              </Text>
              <Text style={[styles.cpfpInfoFeature, { color: theme.colors.textSecondary }]}>
                • Can send to any address or back to your wallet
              </Text>
            </View>
          </View>
        )}
        
        <SettingToggle
          title="Auto-Adjust Fees"
          subtitle="Automatically adjust fees based on network conditions"
          value={feeSettings.autoAdjustFees}
          onValueChange={(value) => {
            console.log(`🔧 Auto-adjust fees toggle: ${value}`);
            updateSetting('autoAdjustFees', value);
          }}
          icon={Zap}
        />

        {/* Auto-Adjust Information Card */}
        {feeSettings.autoAdjustFees && (
          <View style={[styles.autoAdjustInfoCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.autoAdjustInfoHeader}>
              <View style={[styles.autoAdjustInfoIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Info color={theme.colors.primary} size={20} />
              </View>
              <Text style={[styles.autoAdjustInfoTitle, { color: theme.colors.text }]}>
                How Auto-Adjust Works
              </Text>
            </View>
            <Text style={[styles.autoAdjustInfoText, { color: theme.colors.textSecondary }]}>
              When enabled, the wallet automatically adjusts your transaction fees based on current network conditions:
            </Text>
            <View style={styles.autoAdjustInfoFeatures}>
              <Text style={[styles.autoAdjustInfoFeature, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>High Congestion:</Text> Increases fees to ensure faster confirmation
              </Text>
              <Text style={[styles.autoAdjustInfoFeature, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Low Congestion:</Text> Reduces fees to save money when possible
              </Text>
              <Text style={[styles.autoAdjustInfoFeature, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Respects Your Preset:</Text> Works within your chosen fee preference
              </Text>
              <Text style={[styles.autoAdjustInfoFeature, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Manual Override:</Text> Stops auto-adjusting when you manually change fees
              </Text>
            </View>
          </View>
        )}

        {/* Fee Limits */}
        <SectionHeader 
          title="Fee Limits" 
          subtitle="Set maximum fee rates and dust thresholds"
        />
        
        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.settingIcon, { backgroundColor: theme.colors.error + '20' }]}>
            <AlertTriangle color={theme.colors.error} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              Maximum Fee Rate
            </Text>
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
              Prevent accidentally high fees
            </Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.smallInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={feeSettings.maxFeeRate.toString()}
              onChangeText={(text) => {
                console.log(`🔧 Max fee rate input: ${text}`);
                const numericValue = parseInt(text) || 100;
                updateSetting('maxFeeRate', numericValue);
              }}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <Text style={[styles.inputUnit, { color: theme.colors.textSecondary }]}>
              sat/vB
            </Text>
          </View>
        </View>
        
        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.settingIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Info color={theme.colors.primary} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              Dust Threshold
            </Text>
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
              Minimum output value in satoshis
            </Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.smallInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={feeSettings.dustThreshold.toString()}
              onChangeText={(text) => {
                console.log(`🔧 Dust threshold input: ${text}`);
                const numericValue = parseInt(text) || 546;
                updateSetting('dustThreshold', numericValue);
              }}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <Text style={[styles.inputUnit, { color: theme.colors.textSecondary }]}>
              sats
            </Text>
          </View>
        </View>

        {/* Current Network Conditions */}
        {feeEstimates && (
          <>
            <SectionHeader 
              title="Current Network Conditions" 
              subtitle="Live fee estimates from the mempool"
            />
            
            <View style={[styles.networkCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.networkRow}>
                <Text style={[styles.networkLabel, { color: theme.colors.textSecondary }]}>
                  Economy (2-6 hours)
                </Text>
                <Text style={[styles.networkValue, { color: theme.colors.text }]}>
                  {feeEstimates.economyFee} sat/vB
                </Text>
              </View>
              <View style={styles.networkRow}>
                <Text style={[styles.networkLabel, { color: theme.colors.textSecondary }]}>
                  Standard (20-60 min)
                </Text>
                <Text style={[styles.networkValue, { color: theme.colors.text }]}>
                  {feeEstimates.halfHourFee} sat/vB
                </Text>
              </View>
              <View style={styles.networkRow}>
                <Text style={[styles.networkLabel, { color: theme.colors.textSecondary }]}>
                  Priority (5-20 min)
                </Text>
                <Text style={[styles.networkValue, { color: theme.colors.text }]}>
                  {feeEstimates.fastestFee} sat/vB
                </Text>
              </View>
              <View style={styles.networkRow}>
                <Text style={[styles.networkLabel, { color: theme.colors.textSecondary }]}>
                  Minimum (12+ hours)
                </Text>
                <Text style={[styles.networkValue, { color: theme.colors.text }]}>
                  {feeEstimates.minimumFee} sat/vB
                </Text>
              </View>
            </View>
            
            {/* Network Congestion Indicator */}
            <NetworkCongestionIndicator />
          </>
        )}
        
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
  scrollContainer: {
    flex: 1,
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
  refreshButton: {
    padding: 8,
  },
  sectionHeader: {
    marginTop: 30,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
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
    marginBottom: 12,
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
  customFeeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  customFeeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginVertical: 2,
    borderRadius: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 18,
  },
  inputContainer: {
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
  networkCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  networkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  networkLabel: {
    fontSize: 14,
  },
  networkValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  congestionCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  congestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  congestionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  congestionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  congestionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  congestionSubtext: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  cpfpInfoCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  cpfpInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cpfpInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cpfpInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cpfpInfoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cpfpInfoFeatures: {
    marginTop: 8,
  },
  cpfpInfoFeature: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  autoAdjustInfoCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  autoAdjustInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  autoAdjustInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  autoAdjustInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  autoAdjustInfoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  autoAdjustInfoFeatures: {
    marginTop: 8,
  },
  autoAdjustInfoFeature: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  rbfInfoCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  rbfInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rbfInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rbfInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rbfInfoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  rbfInfoFeatures: {
    marginTop: 8,
  },
  rbfInfoFeature: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
});
