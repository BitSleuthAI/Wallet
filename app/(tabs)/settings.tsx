import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Platform,
  Pressable,
  Modal,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Stack, router } from 'expo-router';
import {
  Wallet,
  DollarSign,
  Moon,
  Clock,
  Shield,
  Key,
  FileKey,
  List,
  UserX,
  Info,
  ChevronRight,
  Settings,
  Zap,
  Eye,
  EyeOff,
  Coins,
  X,
  Check,
} from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';
import { useAutoLock } from '@/hooks/auto-lock-store';
import type { FiatCurrency } from '@/types/wallet';

export default function SettingsScreen() {
  const { theme, toggleTheme, logoutAndEraseWallet, currentWallet, wallets, switchWallet, selectedCurrency, setCurrency, getCurrencyName, hideBalance, setHideBalanceSetting } = useWallet();
  const { autoLockTimeout, setAutoLockTimeout } = useAutoLock();
  const [showCurrencyModal, setShowCurrencyModal] = useState<boolean>(false);
  const [showAutoLockModal, setShowAutoLockModal] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout & Erase Wallet',
      'This will permanently delete your wallet from this device. Make sure you have your recovery phrase backed up.\\n\\nThis action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout & Erase', 
          style: 'destructive', 
          onPress: async () => {
            try {
              console.log('🚀 User confirmed wallet logout and erase');
              
              // Show loading state
              Alert.alert(
                'Clearing Wallet Data',
                'Please wait while we securely clear your wallet data...',
                [],
                { cancelable: false }
              );
              
              // Perform the logout and erase
              await logoutAndEraseWallet();
              
              console.log('✅ Wallet logout and erase completed successfully');
              
              // Navigate to wallet setup screen with a slight delay to ensure state is cleared
              setTimeout(() => {
                try {
                  router.replace('/wallet-setup');
                } catch (navError) {
                  console.warn('Navigation error, trying alternative route:', navError);
                  // Fallback navigation
                  router.push('/wallet-setup');
                }
              }, 500);
              
            } catch (error) {
              console.error('❌ Error during logout:', error);
              Alert.alert(
                'Error',
                'There was an error clearing your wallet data. Please try again.\\n\\nError: ' + (error instanceof Error ? error.message : 'Unknown error'),
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
    iconColor = theme.colors.primary 
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    iconColor?: string;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <Icon color={iconColor} size={20} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
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
      <Stack.Screen options={{ title: 'Settings' }} />
      
      <ScrollView style={styles.scrollView}>
        {/* General Section */}
        <SectionHeader title="General" />
        
        <SettingItem
          icon={Wallet}
          title="Current Wallet"
          subtitle={currentWallet ? `${currentWallet.name} (${currentWallet.type})` : 'No wallet selected'}
          onPress={() => wallets.length > 1 ? setShowWalletModal(true) : undefined}
          rightElement={
            wallets.length > 1 ? (
              <View style={styles.walletInfo}>
                <Text style={[styles.walletCount, { color: theme.colors.textSecondary }]}>
                  {wallets.length} wallets
                </Text>
                <ChevronRight color={theme.colors.textSecondary} size={20} />
              </View>
            ) : undefined
          }
        />

        <SettingItem
          icon={Settings}
          title="Wallet Settings"
          subtitle="Configure wallet preferences"
          onPress={() => router.push('/wallet-settings')}
        />

        <SettingItem
          icon={DollarSign}
          title="Display Currency"
          subtitle="Set your preferred currency"
          onPress={() => setShowCurrencyModal(true)}
          rightElement={
            <Text style={[styles.currencyText, { color: theme.colors.textSecondary }]}>
              {selectedCurrency} - {getCurrencyName()}
            </Text>
          }
        />

        <SettingItem
          icon={hideBalance ? EyeOff : Eye}
          title="Hide Balance"
          subtitle="Hide wallet balance across all wallets"
          rightElement={
            <View style={styles.themeToggle}>
              <Text style={[styles.themeText, { color: theme.colors.textSecondary }]}>
                {hideBalance ? 'Hidden' : 'Visible'}
              </Text>
              {Platform.OS === 'web' ? (
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: hideBalance }}
                  onPress={() => setHideBalanceSetting(!hideBalance)}
                  style={[
                    styles.webSwitch,
                    {
                      backgroundColor: hideBalance ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  testID="hide-balance-switch-web"
                >
                  <View
                    style={[
                      styles.webSwitchThumb,
                      {
                        transform: [{ translateX: hideBalance ? 24 : 2 }],
                        backgroundColor: '#FFFFFF',
                      },
                    ]}
                  />
                </Pressable>
              ) : (
                <Switch
                  value={hideBalance}
                  onValueChange={setHideBalanceSetting}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                  ios_backgroundColor={theme.colors.border}
                  testID="hide-balance-switch-native"
                />
              )}
            </View>
          }
        />

        <SettingItem
          icon={Moon}
          title="Theme"
          subtitle="Set your preferred theme"
          rightElement={
            <View style={styles.themeToggle}>
              <Text style={[styles.themeText, { color: theme.colors.textSecondary }]}>
                {theme.isDark ? 'Dark' : 'Light'}
              </Text>
              {Platform.OS === 'web' ? (
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: theme.isDark }}
                  onPress={() => toggleTheme()}
                  style={[
                    styles.webSwitch,
                    {
                      backgroundColor: theme.isDark ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  testID="theme-switch-web"
                >
                  <View
                    style={[
                      styles.webSwitchThumb,
                      {
                        transform: [{ translateX: theme.isDark ? 24 : 2 }],
                        backgroundColor: '#FFFFFF',
                      },
                    ]}
                  />
                </Pressable>
              ) : (
                <Switch
                  value={theme.isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                  ios_backgroundColor={theme.colors.border}
                  testID="theme-switch-native"
                />
              )}
            </View>
          }
        />

        {/* Security Section */}
        <SectionHeader title="Security" />

        <SettingItem
          icon={Clock}
          title="Auto-Lock"
          subtitle="Automatically lock app after inactivity"
          onPress={() => setShowAutoLockModal(true)}
          rightElement={
            <Text style={[styles.timeoutText, { color: theme.colors.textSecondary }]}>
              {autoLockTimeout === -1 ? 'Never' : `${autoLockTimeout} min`}
            </Text>
          }
        />

        <SettingItem
          icon={Shield}
          title="Passkeys & Security Keys"
          subtitle="Secure with a FIDO key or passkey"
          onPress={() => console.log('Security keys')}
        />

        {/* Privacy Section */}
        <SectionHeader title="Privacy" />

        <SettingItem
          icon={UserX}
          title="Transaction Privacy"
          subtitle="Learn about Bitcoin anonymity"
          onPress={() => WebBrowser.openBrowserAsync('https://www.bitsleuth.ai/glossary/transaction-privacy')}
        />

        {/* About Section */}
        <SectionHeader title="About" />

        <SettingItem
          icon={Info}
          title="About BitSleuth Wallet"
          subtitle="Version 1.1.6"
          onPress={() => router.push('/about')}
        />

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: theme.colors.error }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutText, { color: theme.colors.error }]}>
            Logout & Erase Wallet
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Currency
              </Text>
              <TouchableOpacity
                onPress={() => setShowCurrencyModal(false)}
                style={styles.modalCloseButton}
              >
                <X color={theme.colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.currencyList}>
              {(['USD', 'EUR', 'GBP'] as FiatCurrency[]).map((currency) => (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.currencyItem,
                    selectedCurrency === currency && {
                      backgroundColor: theme.colors.primary + '20',
                    },
                  ]}
                  onPress={() => {
                    setCurrency(currency);
                    setShowCurrencyModal(false);
                  }}
                >
                  <View style={styles.currencyInfo}>
                    <Text style={[styles.currencyCode, { color: theme.colors.text }]}>
                      {currency}
                    </Text>
                    <Text style={[styles.currencyName, { color: theme.colors.textSecondary }]}>
                      {getCurrencyName(currency)}
                    </Text>
                  </View>
                  {selectedCurrency === currency && (
                    <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Auto-Lock Selection Modal */}
      <Modal
        visible={showAutoLockModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAutoLockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Auto-Lock Timer
              </Text>
              <TouchableOpacity
                onPress={() => setShowAutoLockModal(false)}
                style={styles.modalCloseButton}
              >
                <X color={theme.colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.currencyList}>
              {[
                { value: 5, label: '5 minutes' },
                { value: 15, label: '15 minutes' },
                { value: 30, label: '30 minutes' },
                { value: 60, label: '1 hour' },
                { value: -1, label: 'Never' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.currencyItem,
                    autoLockTimeout === option.value && {
                      backgroundColor: theme.colors.primary + '20',
                    },
                  ]}
                  onPress={async () => {
                    try {
                      await setAutoLockTimeout(option.value);
                      setShowAutoLockModal(false);
                    } catch (error) {
                      console.error('Error setting auto-lock timeout:', error);
                      Alert.alert('Error', 'Failed to update auto-lock setting');
                    }
                  }}
                >
                  <View style={styles.currencyInfo}>
                    <Text style={[styles.currencyCode, { color: theme.colors.text }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.currencyName, { color: theme.colors.textSecondary }]}>
                      {option.value === -1 
                        ? 'App will never auto-lock' 
                        : `Lock after ${option.label} of inactivity`
                      }
                    </Text>
                  </View>
                  {autoLockTimeout === option.value && (
                    <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Wallet Selection Modal */}
      <Modal
        visible={showWalletModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWalletModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Wallet
              </Text>
              <TouchableOpacity
                onPress={() => setShowWalletModal(false)}
                style={styles.modalCloseButton}
              >
                <X color={theme.colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.currencyList}>
              {wallets.map((wallet) => (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletItem,
                    currentWallet?.id === wallet.id && {
                      backgroundColor: theme.colors.primary + '20',
                    },
                  ]}
                  onPress={() => {
                    switchWallet(wallet.id);
                    setShowWalletModal(false);
                  }}
                >
                  <View style={[
                    styles.walletColorIndicator,
                    { backgroundColor: wallet.color || theme.colors.primary }
                  ]} />
                  <View style={styles.walletItemInfo}>
                    <Text style={[styles.walletItemName, { color: theme.colors.text }]}>
                      {wallet.name}
                    </Text>
                    <Text style={[styles.walletItemType, { color: theme.colors.textSecondary }]}>
                      {wallet.type} • {wallet.addresses.length} address{wallet.addresses.length !== 1 ? 'es' : ''}
                    </Text>
                  </View>
                  {currentWallet?.id === wallet.id && (
                    <Check color={theme.colors.primary} size={20} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  currencyText: {
    fontSize: 14,
    marginRight: 8,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeText: {
    fontSize: 14,
    marginRight: 12,
  },
  timeoutText: {
    fontSize: 14,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 40,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  currencyList: {
    paddingHorizontal: 20,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 2,
    borderRadius: 12,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 14,
    marginTop: 2,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletCount: {
    fontSize: 14,
    marginRight: 8,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 2,
    borderRadius: 12,
  },
  walletColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  walletItemInfo: {
    flex: 1,
  },
  walletItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  walletItemType: {
    fontSize: 14,
    marginTop: 2,
  },
});