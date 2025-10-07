import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
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

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement,
    iconColor = theme.colors.primary,
    danger = false
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    iconColor?: string;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: (danger ? theme.colors.error : iconColor) + '20' }]}>
        <Icon color={danger ? theme.colors.error : iconColor} size={20} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: danger ? theme.colors.error : theme.colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || (onPress && <ChevronRight color={theme.colors.textSecondary} size={20} />)}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: theme.colors.primary }]}>
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
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Wallet Info Section */}
        <SectionHeader title="Wallet Information" />
        
        <SettingItem
          icon={Wallet}
          title="Current Wallet"
          subtitle={currentWallet ? `${currentWallet.name} (${getWalletTypeDisplayName(currentWallet.type)})` : 'No wallet selected'}
        />

        {/* Security & Privacy Section */}
        <SectionHeader title="Security & Privacy" />
        
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
        />



        {/* Transaction Settings Section */}
        <SectionHeader title="Transaction Settings" />

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
        />

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" />

        <SettingItem
          icon={Trash2}
          title="Delete Wallet"
          subtitle="Permanently remove this wallet"
          onPress={handleDeleteWallet}
          danger={true}
        />

          <View style={styles.bottomSpacing} />
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
    fontSize: 18,
    fontWeight: '600',
    marginTop: 30,
    marginBottom: 16,
    marginHorizontal: 20,
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
  iconContainer: {
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
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1.5,
  },
  bottomSpacing: {
    height: 40,
  },
});