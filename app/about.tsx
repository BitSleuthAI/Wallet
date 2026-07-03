import React, { useState } from 'react';
import { PressableOpacity } from '@/components/PressableOpacity';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ChevronDown, ChevronRight, ArrowLeft, AlertTriangle, Bug } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';
import { GradientBackground } from '@/components/GradientBackground';
import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import crashlyticsService from '@/services/crashlytics-service';
import { APP_VERSION } from '@/constants/app-version';

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
  const { theme } = useTheme();

  return (
    <View style={[styles.dropdownContainer, { backgroundColor: theme.colors.surface }]}>
      <PressableOpacity
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
      </PressableOpacity>
      {isExpanded && (
        <View style={styles.dropdownContent}>
          {children}
        </View>
      )}
    </View>
  );
};

export default function AboutScreen() {
  const { theme } = useTheme();

  const handleBack = () => {
    router.back();
  };

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
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      
      <AndroidSafeContainer style={styles.container}>
        {/* Custom Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <PressableOpacity
            style={styles.backButton}
            onPress={handleBack}
            testID="back-button"
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </PressableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            About BitSleuth Wallet
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
            <View style={styles.contentHeader}>
          <Text style={[styles.appTitle, { color: theme.colors.text }]}>
            About BitSleuth Wallet
          </Text>
          <Text style={[styles.version, { color: theme.colors.textSecondary }]}>
            Version {APP_VERSION}
          </Text>
        </View>

        <DropdownSection title="What's New in 1.2.2?" defaultExpanded={true}>
          <BulletPoint text="Open Source Release: BitSleuth Wallet is now open source under the AGPL-3.0 license, with CI/CD, documentation, and community contribution support." />
          <BulletPoint text="Satoshi API Fee Fallback: Fee recommendations stay available even when the primary Esplora fee endpoint fails." />
          <BulletPoint text="Firebase Performance Monitoring: App performance tracking alongside crash reporting (no analytics)." />
          <BulletPoint text="UI Polish: Premium animations, haptic feedback, and micro-interactions across wallet flows." />
          <BulletPoint text="Build Fixes: Resolved iOS (Xcode 26) build errors and Android EAS build failures." />
          <BulletPoint text="Performance: Faster Receive tab QR rendering and wallet import, plus stricter Bitcoin address checksum validation." />
        </DropdownSection>

        <DropdownSection title="What's New in 1.2.1?">
          <BulletPoint text="Device Optimization: App now optimized exclusively for mobile phone screens (iPhone and Android phones only)." />
        </DropdownSection>

        <DropdownSection title="What's New in 1.2.0?">
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

        {/* Developer Tools Section - Only show in development builds */}
        {__DEV__ && (
          <DropdownSection title="🔧 Developer Tools">
            <View style={styles.developerSection}>
              <Text style={[styles.developerWarning, { color: theme.colors.textSecondary }]}>
                These tools are for testing crash reporting. Use only for development purposes.
              </Text>
              
              {/* Test Non-Fatal Error */}
              <PressableOpacity
                style={[styles.testButton, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}
                onPress={() => {
                  Alert.alert(
                    'Test Non-Fatal Error',
                    'This will log a non-fatal error to Firebase Crashlytics.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Send Error',
                        onPress: () => {
                          const testError = new Error('Test non-fatal error from BitSleuth Wallet');
                          crashlyticsService.recordError(testError, {
                            source: 'about_screen',
                            action: 'test_non_fatal_error',
                            platform: Platform.OS,
                            timestamp: new Date().toISOString(),
                          });
                          Alert.alert('Success', 'Non-fatal error sent to Crashlytics. Check Firebase Console.');
                        },
                      },
                    ]
                  );
                }}
              >
                <Bug color={theme.colors.primary} size={20} />
                <Text style={[styles.testButtonText, { color: theme.colors.primary }]}>
                  Test Non-Fatal Error
                </Text>
              </PressableOpacity>

              {/* Test Fatal Crash */}
              <PressableOpacity
                style={[styles.testButton, { backgroundColor: '#EF4444' + '20', borderColor: '#EF4444' }]}
                onPress={() => {
                  Alert.alert(
                    'Test Fatal Crash',
                    'This will force the app to crash. The crash report will be sent on next app launch.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Crash App',
                        style: 'destructive',
                        onPress: () => {
                          setTimeout(() => {
                            crashlyticsService.crash();
                          }, 1000);
                        },
                      },
                    ]
                  );
                }}
              >
                <AlertTriangle color="#EF4444" size={20} />
                <Text style={[styles.testButtonText, { color: '#EF4444' }]}>
                  Test Fatal Crash
                </Text>
              </PressableOpacity>

              {/* Crashlytics Status */}
              <View style={[styles.statusContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                  Crashlytics Status
                </Text>
                <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
                  {crashlyticsService.isAvailable() 
                    ? '✅ Enabled and ready' 
                    : '❌ Not available (use dev build)'}
                </Text>
                <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
                  Platform: {Platform.OS}
                </Text>
                <Text style={[styles.statusText, { color: theme.colors.textSecondary, fontSize: 12, marginTop: 8 }]}>
                  Note: Crashlytics does not work in Expo Go. Build with `npx expo run:ios` or `npx expo run:android`.
                </Text>
              </View>
            </View>
          </DropdownSection>
        )}

        <DropdownSection title="Contact & Support">
          <View style={styles.bulletContainer}>
            <Text style={[styles.bullet, { color: theme.colors.primary }]}>•</Text>
            <Text style={[styles.bulletText, { color: theme.colors.text }]}>
              Visit our website:{' '}
              <Text
                style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}
                onPress={() => Linking.openURL('https://www.bitsleuth.ai')}
              >
                www.bitsleuth.ai
              </Text>
            </Text>
          </View>
          <View style={styles.bulletContainer}>
            <Text style={[styles.bullet, { color: theme.colors.primary }]}>•</Text>
            <Text style={[styles.bulletText, { color: theme.colors.text }]}>
              Email support:{' '}
              <Text
                style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}
                onPress={() => Linking.openURL('mailto:support@bitsleuth.ai')}
              >
                support@bitsleuth.ai
              </Text>
            </Text>
          </View>
          <BulletPoint text="Follow us on social media for updates" />
        </DropdownSection>
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
    paddingHorizontal: 20, // Increased from 16
    paddingVertical: 16, // Increased from 12
    borderBottomWidth: 0,
  },
  backButton: {
    padding: 10, // Increased from 8
    marginLeft: -10, // Adjusted
  },
  headerTitle: {
    fontSize: 20, // Increased from 18
    fontWeight: '700', // More specific than 'bold'
    flex: 1,
    textAlign: 'center',
    marginRight: 36, // Increased from 32
    letterSpacing: 0.1,
  },
  headerSpacer: {
    width: 36, // Increased from 32
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentHeader: {
    paddingHorizontal: 24, // Increased from 20
    paddingVertical: 24, // Increased from 20
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28, // Increased from 24
    fontWeight: '800', // Increased from 700
    marginBottom: 10, // Increased from 8
    letterSpacing: -0.3,
  },
  version: {
    fontSize: 17, // Increased from 16
    fontWeight: '600', // Increased from 500
    letterSpacing: 0.2,
  },
  dropdownContainer: {
    marginHorizontal: 20,
    marginVertical: 6, // Increased from 4
    borderRadius: 16, // Increased from 12
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, // Increased from 16
    paddingVertical: 18, // Increased from 16
  },
  dropdownTitle: {
    fontSize: 18, // Increased from 16
    fontWeight: '700', // Increased from 600
    flex: 1,
    letterSpacing: 0.1,
  },
  dropdownContent: {
    paddingHorizontal: 20, // Increased from 16
    paddingBottom: 20, // Increased from 16
  },
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 12, // Increased from 8
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 18, // Increased from 16
    fontWeight: '700', // Increased from 600
    marginRight: 10, // Increased from 8
    marginTop: 2,
  },
  bulletText: {
    fontSize: 16, // Increased from 14
    lineHeight: 24, // Increased from 20
    flex: 1,
    letterSpacing: 0.2,
  },
  missionText: {
    fontSize: 16, // Increased from 14
    lineHeight: 26, // Increased from 22
    textAlign: 'left',
    letterSpacing: 0.2,
  },
  // Developer Tools Styles
  developerSection: {
    padding: 16,
    gap: 12,
  },
  developerWarning: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statusContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
  },
});