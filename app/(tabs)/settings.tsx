import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
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
} from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';

export default function SettingsScreen() {
  const { theme, toggleTheme } = useWallet();

  const handleLogout = () => {
    Alert.alert(
      'Logout & Erase Wallet',
      'This will permanently delete your wallet from this device. Make sure you have your recovery phrase backed up.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout & Erase', style: 'destructive', onPress: () => console.log('Logout') },
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
          title="Manage Wallets"
          subtitle="Add, edit, or remove wallets"
          onPress={() => console.log('Manage wallets')}
        />

        <SettingItem
          icon={DollarSign}
          title="Display Currency"
          subtitle="Set your preferred currency"
          rightElement={
            <Text style={[styles.currencyText, { color: theme.colors.textSecondary }]}>
              USD - United States Dollar
            </Text>
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
              <Switch
                value={theme.isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor="white"
              />
            </View>
          }
        />

        <SettingItem
          icon={Clock}
          title="Transaction History"
          subtitle="View all wallet transactions"
          onPress={() => console.log('Transaction history')}
        />

        {/* Security Section */}
        <SectionHeader title="Security" />

        <SettingItem
          icon={Clock}
          title="Auto-Lock"
          subtitle="Set inactivity timeout"
          rightElement={
            <Text style={[styles.timeoutText, { color: theme.colors.textSecondary }]}>
              15 minutes
            </Text>
          }
        />

        <SettingItem
          icon={Shield}
          title="Passkeys & Security Keys"
          subtitle="Secure with a FIDO key or passkey"
          onPress={() => console.log('Security keys')}
        />

        <SettingItem
          icon={Key}
          title="View Recovery Phrase"
          subtitle="Your BIP39 recovery phrase"
          onPress={() => console.log('Recovery phrase')}
        />

        <SettingItem
          icon={FileKey}
          title="Generate XPUB"
          subtitle="View your extended public key"
          onPress={() => console.log('Generate XPUB')}
        />

        <SettingItem
          icon={List}
          title="View Addresses"
          subtitle="Show all derived addresses"
          onPress={() => console.log('View addresses')}
        />

        {/* Privacy Section */}
        <SectionHeader title="Privacy" />

        <SettingItem
          icon={UserX}
          title="Transaction Privacy"
          subtitle="Learn about Bitcoin anonymity"
          onPress={() => console.log('Transaction privacy')}
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
});