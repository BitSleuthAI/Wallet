import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
  Wallet,
  Key,
  FileKey,
  List,
  Coins,
  Zap,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';

export default function WalletSettingsScreen() {
  const { 
    theme, 
    currentWallet, 
    logoutAndEraseWallet 
  } = useWallet();

  const handleDeleteWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'This will permanently delete your wallet from this device. Make sure you have your recovery phrase backed up.\n\nThis action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Wallet', 
          style: 'destructive', 
          onPress: async () => {
            try {
              console.log('🗑️ User confirmed wallet deletion');
              
              Alert.alert(
                'Deleting Wallet',
                'Please wait while we securely delete your wallet data...',
                [],
                { cancelable: false }
              );
              
              await logoutAndEraseWallet();
              
              console.log('✅ Wallet deletion completed successfully');
              
              setTimeout(() => {
                try {
                  router.replace('/wallet-setup');
                } catch (navError) {
                  console.warn('Navigation error, trying alternative route:', navError);
                  router.push('/wallet-setup');
                }
              }, 500);
              
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Wallet Settings',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
        }} 
      />
      
      <ScrollView style={styles.scrollView}>
        {/* Wallet Info Section */}
        <SectionHeader title="Wallet Information" />
        
        <SettingItem
          icon={Wallet}
          title="Current Wallet"
          subtitle={currentWallet ? `${currentWallet.name} (${currentWallet.type})` : 'No wallet selected'}
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

        <SettingItem
          icon={Key}
          title="Passkeys & Security Keys"
          subtitle="Manage biometric and hardware security"
          onPress={() => router.push('/passkeys-security')}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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