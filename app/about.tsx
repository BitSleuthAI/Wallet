import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';
import { GradientBackground } from '@/components/GradientBackground';

interface DropdownSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const DropdownSection: React.FC<DropdownSectionProps> = ({ 
  title, 
  children, 
  defaultExpanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { theme } = useWallet();

  return (
    <View style={[styles.dropdownContainer, { backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={[styles.dropdownTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        {isExpanded ? (
          <ChevronDown color={theme.colors.textSecondary} size={20} />
        ) : (
          <ChevronRight color={theme.colors.textSecondary} size={20} />
        )}
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.dropdownContent}>
          {children}
        </View>
      )}
    </View>
  );
};

export default function AboutScreen() {
  const { theme } = useWallet();

  const BulletPoint = ({ text }: { text: string }) => (
    <View style={styles.bulletContainer}>
      <Text style={[styles.bullet, { color: theme.colors.primary }]}>•</Text>
      <Text style={[styles.bulletText, { color: theme.colors.text }]}>
        {text}
      </Text>
    </View>
  );

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'About BitSleuth Wallet',
            headerBackTitle: 'Settings',
            headerStyle: {
              backgroundColor: 'transparent',
            },
            headerTintColor: theme.colors.text,
            headerTitleStyle: {
              color: theme.colors.text,
            },
          }} 
        />
        
        <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.appTitle, { color: theme.colors.text }]}>
            About BitSleuth Wallet
          </Text>
          <Text style={[styles.version, { color: theme.colors.textSecondary }]}>
            Version 1.1.6
          </Text>
        </View>

        <DropdownSection title="What's New in 1.1.6?" defaultExpanded={true}>
          <BulletPoint text="Fixed connection issues, including 'Too Many Requests' errors." />
          <BulletPoint text="Multi-Wallet Mastery: Added the ability to add and manage multiple wallets, each with its own name and color." />
          <BulletPoint text="24-Hour Price Oracle: The balance chart now includes a 24-hour price change indicator." />
          <BulletPoint text="API Whisperer: Implemented a more robust method for handling API responses." />
          <BulletPoint text="Client/Server Harmony: Refactored components to separate client-side and server-side logic." />
        </DropdownSection>

        <DropdownSection title="What's New in 1.1.5?">
          <BulletPoint text="Enhanced security features and improved wallet synchronization." />
          <BulletPoint text="Better error handling for network connectivity issues." />
          <BulletPoint text="Performance optimizations for faster transaction processing." />
        </DropdownSection>

        <DropdownSection title="What's New in 1.1.4?">
          <BulletPoint text="Improved user interface with better accessibility features." />
          <BulletPoint text="Enhanced QR code scanning functionality." />
          <BulletPoint text="Bug fixes for transaction history display." />
        </DropdownSection>

        <DropdownSection title="What's New in 1.1.3?">
          <BulletPoint text="Added support for custom transaction fees." />
          <BulletPoint text="Improved wallet backup and recovery process." />
          <BulletPoint text="Enhanced security with biometric authentication." />
        </DropdownSection>

        <DropdownSection title="What's New in 1.1.2?">
          <BulletPoint text="Initial release with core wallet functionality." />
          <BulletPoint text="Bitcoin send and receive capabilities." />
          <BulletPoint text="Secure wallet creation and import features." />
        </DropdownSection>

        <DropdownSection title="Future Roadmap">
          <BulletPoint text="Transaction Insights: Use AI to analyze spending habits and provide personalized financial insights." />
          <BulletPoint text="Fee Optimization: AI-powered fee recommendations for optimal transaction costs." />
          <BulletPoint text="Security Scoring: Advanced security analysis and recommendations." />
          <BulletPoint text="Multi-currency support for other cryptocurrencies." />
          <BulletPoint text="Advanced privacy features and coin mixing capabilities." />
        </DropdownSection>

        <DropdownSection title="Our Mission">
          <Text style={[styles.missionText, { color: theme.colors.text }]}>
            To build a secure, easy-to-use, and intelligent Bitcoin wallet that empowers users 
            to take full control of their digital assets while providing advanced insights and 
            security features powered by artificial intelligence.
          </Text>
        </DropdownSection>

        <DropdownSection title="Contact & Support">
          <BulletPoint text="Visit our website: wallet.bitsleuth.ai" />
          <BulletPoint text="Email support: support@bitsleuth.ai" />
          <BulletPoint text="Follow us on social media for updates" />
        </DropdownSection>
        </ScrollView>
      </SafeAreaView>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  version: {
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownContainer: {
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  dropdownContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  missionText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'left',
  },
});