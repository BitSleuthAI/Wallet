import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { useWallet } from '@/hooks/wallet-store';
import { Stack, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PrivacyPolicyScreen() {
  const { theme } = useWallet();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const BulletPoint = ({ text }: { text: string }) => (
    <View style={styles.bulletContainer}>
      <Text style={[styles.bullet, { color: theme.colors.primary }]}>•</Text>
      <Text style={[styles.bulletText, { color: theme.colors.text }]}>
        {text}
      </Text>
    </View>
  );

  const handleBack = () => {
    router.back();
  };

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
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            testID="back-button"
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Privacy Policy
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentHeader}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Privacy Policy
            </Text>
            <Text style={[styles.effectiveDate, { color: theme.colors.textSecondary }]}>
              Effective Date: 9 September 2025
            </Text>
          </View>

          <Text style={[styles.introText, { color: theme.colors.text }]}>
            Welcome to Bitsleuth Wallet. Your privacy is extremely important to us. This Privacy Policy explains how we handle information within our mobile wallet app for iOS and Android.
          </Text>

          <Text style={[styles.agreementText, { color: theme.colors.text }]}>
            By using Bitsleuth Wallet, you agree to the terms of this Privacy Policy.
          </Text>

          <Section title="1. Who We Are">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Bitsleuth is a technology company focused on delivering a privacy-first Bitcoin wallet. Our app is designed to minimize data collection while giving users full control over their digital assets.
            </Text>
          </Section>

          <Section title="2. Information We Collect">
            <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>
              Crash & Performance Data
            </Text>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              We collect anonymized crash logs and diagnostic information to help us detect bugs and improve stability.
            </Text>
            <BulletPoint text="This may include device type, operating system version, app version, and error logs." />
            <BulletPoint text="We do not collect personal information, wallet addresses, transaction history, or private keys." />
            
            <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>
              Wallet Data
            </Text>
            <BulletPoint text="Your private keys and Bitcoin wallet data are generated and stored only on your device." />
            <BulletPoint text="They never leave your device and are never transmitted to us." />
            
            <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>
              Cookies
            </Text>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              The Bitsleuth Wallet mobile app does not use cookies.
            </Text>
          </Section>

          <Section title="3. How We Use Information">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              We use crash and diagnostic information only for:
            </Text>
            <BulletPoint text="Identifying app errors and improving performance." />
            <BulletPoint text="Enhancing the reliability and security of our app." />
            
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              We do not:
            </Text>
            <BulletPoint text="Collect personal data." />
            <BulletPoint text="Track you across apps or websites." />
            <BulletPoint text="Sell, rent, or share data with advertisers or third parties." />
          </Section>

          <Section title="4. Data Storage & Retention">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Crash data is stored by our crash analytics provider (e.g., Firebase Crashlytics) under their own retention policies.
            </Text>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              We do not store, retain, or access your wallet data, private keys, or transactions.
            </Text>
          </Section>

          <Section title="5. Your Rights">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Depending on your location, you may have rights under applicable data protection laws, including:
            </Text>
            <BulletPoint text="The right to know what limited data is collected (crash reports)." />
            <BulletPoint text="The right to request deletion of crash data associated with your device (through your device ID anonymization)." />
            <BulletPoint text="The right to contact us with any privacy-related concerns." />
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              To exercise your rights, please email us at{' '}
              <Text 
                style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}
                onPress={() => Linking.openURL('mailto:hello@bitsleuth.ai')}
              >
                hello@bitsleuth.ai
              </Text>.
            </Text>
          </Section>

          <Section title="6. Data Security">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              We take appropriate technical and organizational measures to secure crash analytics data. Your wallet keys and Bitcoin transaction data remain securely on your device at all times.
            </Text>
          </Section>

          <Section title="7. Children's Privacy">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Bitsleuth Wallet is not intended for use by individuals under 18. We do not knowingly collect data from children.
            </Text>
          </Section>

          <Section title="8. Changes to This Policy">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              We may update this Privacy Policy periodically. Updates will be published in the app and will take effect upon posting.
            </Text>
          </Section>

          <Section title="9. Contact Us">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              If you have any questions about this Privacy Policy, please contact us at:
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:hello@bitsleuth.ai')}>
              <Text style={[styles.contactEmail, { color: theme.colors.primary }]}>
                📧 hello@bitsleuth.ai
              </Text>
            </TouchableOpacity>
          </Section>

          <View style={styles.copyright}>
            <Text style={[styles.copyrightText, { color: theme.colors.textSecondary }]}>
              © 2025 Bitsleuth. All rights reserved.
            </Text>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  effectiveDate: {
    fontSize: 16,
    fontWeight: '500',
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    textAlign: 'left',
  },
  agreementText: {
    fontSize: 16,
    lineHeight: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    textAlign: 'left',
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  sectionContent: {
    paddingLeft: 0,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'left',
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
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  copyright: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
