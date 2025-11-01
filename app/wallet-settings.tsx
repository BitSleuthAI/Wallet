import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { LiquidGlassView } from '@/components/LiquidGlassView';
import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import { getWalletTypeDisplayName } from '@/types/wallet';
import { Stack, router } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Coins,
  FileKey,
  Key,
  List,
  Trash2,
  Wallet,
  Zap,
} from 'lucide-react-native';
import React from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';


export default function WalletSettingsScreen() {
  const walletContext = useWallet();
  
  // Safely destructure with fallbacks to prevent crashes
  const { 
    theme, 
    currentWallet, 
    deleteWallet,
    wallets = []
  } = walletContext || {};

  const handleDeleteWallet = () => {
    // Check if there's no current wallet
    if (!currentWallet) {
      Alert.alert(
        'No Wallet Selected',
        'Please select a wallet to delete.'
      );
      return;
    }

    // Check if deleteWallet function is available
    if (!deleteWallet) {
      Alert.alert('Error', 'Unable to delete wallet at this time.');
      return;
    }

    // Check if this is the last wallet
    if (wallets.length <= 1) {
      Alert.alert(
        'Cannot Delete',
        'You must have at least one wallet. Create another wallet before deleting this one.'
      );
      return;
    }

    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${currentWallet.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Wallet', 
          style: 'destructive', 
          onPress: async () => {
            try {
              console.log('🗑️ User confirmed wallet deletion for:', currentWallet.name);
              
              // Wait for deletion to complete
              await deleteWallet(currentWallet.id);
              
              console.log('✅ Wallet deletion completed successfully');
              
              // Give time for state to settle before navigating
              setTimeout(() => {
                router.back();
              }, 300);
              
            } catch (error) {
              console.error('❌ Error during wallet deletion:', error);
              Alert.alert(
                'Error',
                'There was an error deleting your wallet. Please try again.\n\nError: ' + (error instanceof Error ? error.message : 'Unknown error'),
                [{ text: 'OK' }]
              );
            }
          }
        },
      ]
    );
  };

const SettingSection: React.FC<{ children: React.ReactNode; theme: any }> = ({ children, theme }) => (
    <LiquidGlassView
        style={[
            styles.sectionCard,
            Platform.OS === 'android' && { backgroundColor: theme.colors.surface },
        ]}
    >
        {children}
    </LiquidGlassView>
);

const SettingItem: React.FC<{
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    danger?: boolean;
    showDivider?: boolean;
}> = ({ icon: Icon, title, subtitle, onPress, danger, showDivider = true }) => (
    <>
        <TouchableOpacity
            style={styles.settingItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.settingLeft}>
                <View
                    style={[
                        styles.iconContainer,
                        {
                            backgroundColor: danger
                                ? `${theme.colors.error}20`
                                : `${theme.colors.primary}20`,
                        },
                    ]}
                >
                    <Icon size={20} color={danger ? theme.colors.error : theme.colors.primary} />
                </View>
                <View style={styles.settingTextContainer}>
                    <Text
                        style={[
                            styles.settingLabel,
                            { color: danger ? theme.colors.error : theme.colors.text },
                        ]}
                    >
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>
            {onPress && (
                <ChevronRight size={20} color={theme.colors.textSecondary} />
            )}
        </TouchableOpacity>
        {showDivider && (
            <View
                style={[
                    styles.divider,
                    {
                        backgroundColor:
                            Platform.OS === 'android'
                                ? theme.colors.border
                                : `${theme.colors.border}40`,
                    },
                ]}
            />
        )}
    </>
);

const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>
      {title}
    </Text>
  );

  const handleBack = () => {
    router.back();
  };

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <AndroidSafeContainer style={styles.container} enableBottomPadding={false}>
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
            Wallet Settings
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            paddingBottom: Platform.OS === 'android' ? 100 : 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Wallet Info Section */}
          <SectionHeader title="Wallet Information" />
          <SettingSection theme={theme}>
            <SettingItem
              icon={Wallet}
              title="Current Wallet"
              subtitle={currentWallet ? `${currentWallet.name} (${getWalletTypeDisplayName(currentWallet.type)})` : 'No wallet selected'}
              showDivider={false}
            />
          </SettingSection>

          {/* Security & Privacy Section */}
          <SectionHeader title="Security & Privacy" />
          <SettingSection theme={theme}>
            <SettingItem
              icon={Key}
              title="View Recovery Phrase"
              subtitle="Your BIP39 recovery phrase"
              onPress={() => router.push('/view-recovery-phrase')}
            />

            <SettingItem
              icon={FileKey}
              title="Generate XPUB"
              subtitle="View your extended public key"
              onPress={() => router.push('/generate-xpub')}
            />

            <SettingItem
              icon={List}
              title="View Addresses"
              subtitle="Show all derived addresses"
              onPress={() => router.push('/wallet-addresses')}
              showDivider={false}
            />
          </SettingSection>

          {/* Transaction Settings Section */}
          <SectionHeader title="Transaction Settings" />
          <SettingSection theme={theme}>
            <SettingItem
              icon={Zap}
              title="Fee Settings"
              subtitle="Configure transaction fee preferences"
              onPress={() => router.push('/fee-settings')}
            />

            <SettingItem
              icon={Coins}
              title="Coin Control"
              subtitle="Advanced UTXO management"
              onPress={() => router.push('/coin-control')}
            />

            <SettingItem
              icon={List}
              title="Transaction History"
              subtitle="View all wallet transactions"
              onPress={() => router.push('/transaction-history')}
              showDivider={false}
            />
          </SettingSection>

          {/* Danger Zone */}
          <SectionHeader title="Danger Zone" />
          <SettingSection theme={theme}>
            <SettingItem
              icon={Trash2}
              title="Delete Wallet"
              subtitle="Permanently remove this wallet"
              onPress={handleDeleteWallet}
              danger={true}
              showDivider={false}
            />
          </SettingSection>
        </ScrollView>
      </AndroidSafeContainer>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  sectionCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    ...platformStyles.cardShadow,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60, // 16 (padding) + 32 (icon) + 12 (margin)
  },
  timeoutText: {
    fontSize: 14,
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
    // backgroundColor will be set dynamically via theme.colors.surface
    ...platformStyles.shadow,
  },
  bottomSpacing: {
    height: 40,
  },
});