import { GradientBackground } from '@/components/GradientBackground';
import { LiquidGlassView } from '@/components/LiquidGlassView';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import { platformStyles } from '@/constants/themes';
import { useAutoLock } from '@/hooks/auto-lock-store';
import { useTabAnimation } from '@/hooks/use-tab-animation';
import { useWallet } from '@/hooks/wallet-store';
import { HapticService } from '@/services/haptic-service';

import type { FiatCurrency } from '@/types/wallet';
import { getWalletTypeDisplayName } from '@/types/wallet';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
    AlertTriangle,
    Check,
    ChevronRight,
    Clock,
    DollarSign,
    Euro,
    Eye,
    EyeOff,
    FileText,
    FolderOpen,
    Info,
    Lock,
    Moon,
    PoundSterling,
    Scale,
    Settings,
    Shield,
    Sun,
    UserX,
    Wallet,
    X
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    Animated as RNAnimated,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ReanimatedAnimated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

// Wrapper component that checks for context availability
export default function SettingsScreen() {
  const walletContext = useWallet();
  
  // Safety check: if context is not available yet, show loading
  if (!walletContext) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0F' }}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
    );
  }
  
  return <SettingsScreenContent />;
}

// Main component with all hooks
function SettingsScreenContent() {
  const { animatedStyle } = useTabAnimation(3); // Settings tab = index 3
  const { theme, toggleTheme, logoutAndEraseWallet, currentWallet, wallets, switchWallet, selectedCurrency, setCurrency, getCurrencyName, hideBalance, setHideBalanceSetting } = useWallet()!; // Non-null assertion is safe here because wrapper checked
  const { autoLockTimeout, setAutoLockTimeout } = useAutoLock();
  
  // Initialize all state hooks
  const [showCurrencyModal, setShowCurrencyModal] = useState<boolean>(false);
  const [showAutoLockModal, setShowAutoLockModal] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  
  // Animation values for logout button
  const logoutScale = useSharedValue(1);
  const AnimatedTouchable = ReanimatedAnimated.createAnimatedComponent(TouchableOpacity);

  const logoutAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoutScale.value }],
  }));

  // Logout button gradient colors (danger/error theme)
  // Using fixed colors for consistency across themes while maintaining danger indication
  const logoutGradientColors: readonly [string, string, ...string[]] = theme.isDark 
    ? ['#FF5252', '#E91E63'] // Bright red to pink for dark mode
    : ['#EF4444', '#DC2626']; // Red gradient for light mode

  const handleLogout = () => {
    if (isLoggingOut) return; // Prevent multiple logout attempts
    
    Alert.alert(
      'Logout & Erase Wallet',
      'This will permanently delete your wallet from this device. Make sure you have your recovery phrase backed up.\\n\\nThis action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout & Erase', 
          style: 'destructive', 
          onPress: async () => {
            setIsLoggingOut(true);
            
            // Trigger haptic feedback after user confirms
            HapticService.warning();
            HapticService.error();
            
            try {
              console.log('🚀 User confirmed wallet logout and erase');
              
              // Perform the logout and erase without showing a blocking alert
              await logoutAndEraseWallet();
              
              console.log('✅ Wallet logout and erase completed successfully');
              
              // Navigate to wallet setup screen immediately
              try {
                router.replace('/wallet-setup');
              } catch (navError) {
                console.warn('Navigation error, trying alternative route:', navError);
                // Fallback navigation
                router.push('/wallet-setup');
              }
              
            } catch (error) {
              console.error('❌ Error during logout:', error);
              setIsLoggingOut(false);
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

  const handleLogoutPressIn = () => {
    if (isLoggingOut) return;
    HapticService.light();
    logoutScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handleLogoutPressOut = () => {
    if (isLoggingOut) return;
    logoutScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement,
    iconColor = theme.colors.primary,
    showDivider = true,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    iconColor?: string;
    showDivider?: boolean;
  }) => (
    <>
      <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
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
      {showDivider && (
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      )}
    </>
  );

  const SettingSection = ({ children }: { children: React.ReactNode }) => (
    <LiquidGlassView variant="thin" intensity={75} style={[
      styles.sectionCard,
      Platform.OS === 'android' && {
        backgroundColor: theme.colors.surface,
      }
    ]}>
      {children}
    </LiquidGlassView>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: theme.colors.primary }]}>
      {title}
    </Text>
  );

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Settings',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: theme.colors.text,
          }} 
        />
        
        <RNAnimated.View style={[styles.animatedContainer, animatedStyle]}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* General Section */}
          <SectionHeader title="General" />
          
          <SettingSection>
            <SettingItem
              icon={FolderOpen}
              title="Manage Wallets"
              subtitle="Add, edit, or remove wallets"
              onPress={() => router.push('/manage-wallets')}
            />
            
            <SettingItem
              icon={Wallet}
              title="Current Wallet"
              subtitle={currentWallet ? `${currentWallet.name} (${getWalletTypeDisplayName(currentWallet.type)})` : 'No wallet selected'}
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
              icon={selectedCurrency === 'USD' ? DollarSign : selectedCurrency === 'EUR' ? Euro : PoundSterling}
              title="Display Currency"
              subtitle="Set your preferred currency"
              onPress={() => setShowCurrencyModal(true)}
              rightElement={
                <View style={styles.currencyContainer}>
                  <Text style={[styles.currencyText, { color: theme.colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                    {selectedCurrency} - {getCurrencyName()}
                  </Text>
                  <ChevronRight color={theme.colors.textSecondary} size={20} />
                </View>
              }
            />

            <SettingItem
              icon={hideBalance ? EyeOff : Eye}
              title="Hide Balance"
              subtitle="Hide wallet balance across all wallets"
              showDivider={false}
              rightElement={
              <View style={styles.themeToggle}>
                <Text style={[styles.themeText, { color: theme.colors.textSecondary }]}>
                  {hideBalance ? 'Hidden' : 'Visible'}
                </Text>
                <ThemedSwitch
                  value={hideBalance}
                  onValueChange={setHideBalanceSetting}
                  theme={theme}
                  testID="hide-balance-switch"
                />
              </View>
            }
            />

            <SettingItem
              icon={theme.isDark ? Moon : Sun}
              title="Theme"
              subtitle="Set your preferred theme"
              showDivider={false}
              rightElement={
              <View style={styles.themeToggle}>
                <Text style={[styles.themeText, { color: theme.colors.textSecondary }]}>
                  {theme.isDark ? 'Dark' : 'Light'}
                </Text>
                <ThemedSwitch
                  value={theme.isDark}
                  onValueChange={toggleTheme}
                  theme={theme}
                  testID="theme-switch"
                />
              </View>
            }
            />
          </SettingSection>

          {/* Security Section */}
          <SectionHeader title="Security" />

          <SettingSection>
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
              title="Biometric Authentication"
              subtitle="Secure your wallet with biometrics"
              onPress={() => router.push('/passkeys-security')}
              showDivider={false}
            />
          </SettingSection>

          {/* Privacy Section */}
          <SectionHeader title="Privacy" />

          <SettingSection>
            <SettingItem
              icon={UserX}
              title="Transaction Privacy"
              subtitle="Learn about Bitcoin anonymity"
              onPress={() => WebBrowser.openBrowserAsync('https://www.bitsleuth.ai/glossary/transaction-privacy')}
              showDivider={false}
            />
          </SettingSection>

          {/* About Section */}
          <SectionHeader title="About" />

          <SettingSection>
            <SettingItem
              icon={Info}
              title="About BitSleuth Wallet"
              subtitle="Version 1.2.0"
              onPress={() => router.push('/about')}
            />

            <SettingItem
              icon={FileText}
              title="Terms of Service"
              subtitle="Read our terms and conditions"
              onPress={() => router.push('/terms-of-service')}
            />

            <SettingItem
              icon={Lock}
              title="Privacy Policy"
              subtitle="Learn how we protect your privacy"
              onPress={() => router.push('/privacy-policy')}
            />

            <SettingItem
              icon={Scale}
              title="Legal Disclaimer"
              subtitle="Important legal information"
              onPress={() => router.push('/legal-disclaimer')}
              showDivider={false}
            />
          </SettingSection>



          {/* Logout Button */}
          <AnimatedTouchable
            style={[
              styles.logoutButton,
              logoutAnimatedStyle,
              { opacity: isLoggingOut ? 0.7 : 1 }
            ]}
            onPressIn={handleLogoutPressIn}
            onPressOut={handleLogoutPressOut}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={logoutGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.logoutButtonContent}>
              {/* White color for maximum contrast against gradient background */}
              <AlertTriangle color="#FFFFFF" size={20} strokeWidth={2.5} />
              <Text style={styles.logoutText}>
                {isLoggingOut ? 'Clearing Wallet Data...' : 'Logout & Erase Wallet'}
              </Text>
            </View>
          </AnimatedTouchable>
        </ScrollView>
      </RNAnimated.View>

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
                      {getWalletTypeDisplayName(wallet.type)} • {wallet.addresses.length} address{wallet.addresses.length !== 1 ? 'es' : ''}
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
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // Add sufficient bottom padding to prevent content from going under tab bar
    // iOS tab bar height (~49pt) + safe area (~34pt) + spacing = ~100pt
    paddingBottom: platformStyles.tabBarBottomPadding,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginTop: platformStyles.spacing.xxxl,
    marginBottom: platformStyles.spacing.md,
    marginHorizontal: platformStyles.spacing.xl,
    opacity: 0.6,
  },
  sectionCard: {
    marginHorizontal: platformStyles.spacing.xl,
    marginBottom: platformStyles.spacing.xl,
    borderRadius: platformStyles.borderRadius.xxl,
    overflow: 'hidden',
    ...platformStyles.cardShadow,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: platformStyles.spacing.xl,
    paddingVertical: platformStyles.spacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76, // Align with text after icon (44px icon + 16px margin + 16px padding)
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: platformStyles.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.lg,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 15,
    marginTop: 3,
    lineHeight: 20,
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 160,
    minWidth: 120,
  },
  currencyText: {
    fontSize: 15,
    marginRight: 8,
    flex: 1,
    textAlign: 'right',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeText: {
    fontSize: 15,
    marginRight: platformStyles.spacing.md,
  },
  timeoutText: {
    fontSize: 15,
  },
  logoutButton: {
    marginHorizontal: platformStyles.spacing.xl,
    marginTop: platformStyles.spacing.huge,
    marginBottom: platformStyles.spacing.huge,
    paddingVertical: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 56,
    ...platformStyles.buttonShadow,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF', // Always white on colored logout button
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: platformStyles.borderRadius.xxl,
    borderTopRightRadius: platformStyles.borderRadius.xxl,
    paddingTop: platformStyles.spacing.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: platformStyles.spacing.xl,
    paddingBottom: platformStyles.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  currencyList: {
    paddingHorizontal: platformStyles.spacing.xl,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.lg,
    paddingHorizontal: platformStyles.spacing.lg,
    marginVertical: platformStyles.spacing.xs,
    borderRadius: platformStyles.borderRadius.large,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 17,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 15,
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
    fontSize: 15,
    marginRight: 8,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.lg,
    paddingHorizontal: platformStyles.spacing.lg,
    marginVertical: platformStyles.spacing.xs,
    borderRadius: platformStyles.borderRadius.large,
  },
  walletColorIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: platformStyles.spacing.md,
  },
  walletItemInfo: {
    flex: 1,
  },
  walletItemName: {
    fontSize: 17,
    fontWeight: '600',
  },
  walletItemType: {
    fontSize: 15,
    marginTop: 2,
  },
});