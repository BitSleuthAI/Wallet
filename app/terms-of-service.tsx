import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { useWallet } from '@/hooks/wallet-store';
import { Stack } from 'expo-router';
import React from 'react';
import {
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function TermsOfServiceScreen() {
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

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <Stack.Screen 
        options={{ 
          title: 'Terms of Service',
        }} 
      />
      
      <AndroidSafeContainer style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === 'ios' && { paddingTop: 75 }
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Terms of Service
            </Text>
            <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary }]}>
              Last Updated: 9 September 2025
            </Text>
          </View>

          <Text style={[styles.introText, { color: theme.colors.text }]}>
            Welcome to Bitsleuth Wallet. These Terms of Service ("Terms") govern your use of the Bitsleuth Wallet mobile application (the "App"). Please read these Terms carefully before using the App. By downloading, installing, or using the App, you agree to these Terms. If you do not agree, you must not use the App.
          </Text>

          <Section title="1. Who We Are">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Bitsleuth is a technology company that provides a non-custodial, privacy-first Bitcoin wallet. We do not hold, manage, or exchange cryptocurrency on behalf of users. You remain in full control of your private keys and Bitcoin at all times.
            </Text>
          </Section>

          <Section title="2. Eligibility">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              You must be at least 18 years old, or the age of legal majority in your jurisdiction, to use Bitsleuth Wallet. By using the App, you confirm that you meet these requirements.
            </Text>
          </Section>

          <Section title="3. Acceptable Use">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              You agree to use Bitsleuth Wallet only for lawful purposes. You must not:
            </Text>
            <BulletPoint text="Use the App for illegal activities (e.g., money laundering, terrorist financing)." />
            <BulletPoint text="Attempt to gain unauthorized access to, disrupt, or harm the App." />
            <BulletPoint text="Use automated tools (e.g., bots, scrapers) without our permission." />
          </Section>

          <Section title="4. The Wallet Service">
            <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>
              Non-Custodial:
            </Text>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Bitsleuth Wallet is non-custodial. Private keys are generated and stored on your device only. We cannot access, recover, or reset your private keys, passphrase, or wallet.
            </Text>
            
            <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>
              User Responsibility:
            </Text>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              You are solely responsible for safeguarding your recovery phrase, backups, and device security. If you lose access to your keys, your Bitcoin may be permanently unrecoverable.
            </Text>
            
            <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>
              Transactions:
            </Text>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Bitcoin transactions are irreversible. Bitsleuth cannot cancel, reverse, or refund transactions.
            </Text>
          </Section>

          <Section title="5. Privacy">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              We respect your privacy.
            </Text>
            <BulletPoint text="The App does not collect personal information, wallet addresses, or transaction data." />
            <BulletPoint text="We use anonymized crash and performance analytics (e.g., device type, OS version, crash logs) to identify bugs and improve stability. This data is not linked to you personally." />
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              For more information, please see our Privacy Policy.
            </Text>
          </Section>

          <Section title="6. No Custody or Exchange Services">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Bitsleuth Wallet does not provide custodial services, crypto-to-fiat conversion, or fiat payment processing. We do not partner with third-party exchanges inside the app.
            </Text>
          </Section>

          <Section title="7. Intellectual Property">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              All branding, software, and content within the App are owned by Bitsleuth or its licensors and protected by intellectual property laws. You may not copy, modify, or redistribute any part of the App without our written consent.
            </Text>
          </Section>

          <Section title="8. Disclaimers">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              The App is provided "as is" and "as available." We do not guarantee that:
            </Text>
            <BulletPoint text="The App will always function without bugs, downtime, or interruptions." />
            <BulletPoint text="The App or any features will meet your specific needs." />
            <BulletPoint text="Any data, analytics, or features will always be accurate or error-free." />
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              You use the App entirely at your own risk.
            </Text>
          </Section>

          <Section title="9. Limitation of Liability">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              To the fullest extent permitted by law, Bitsleuth is not liable for:
            </Text>
            <BulletPoint text="Loss of access to your wallet due to lost or stolen passphrases, private keys, or devices." />
            <BulletPoint text="Irrecoverable Bitcoin transactions." />
            <BulletPoint text="Indirect, incidental, or consequential damages arising from use of the App." />
            <BulletPoint text="Losses resulting from reliance on any information provided by the App." />
          </Section>

          <Section title="10. Changes to These Terms">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              We may update these Terms from time to time. Updates will be effective once posted in the App. Continued use of the App after changes are posted means you accept the revised Terms.
            </Text>
          </Section>

          <Section title="11. Contact Us">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              If you have questions about these Terms, please contact us at:
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:hello@bitsleuth.ai')}>
              <Text style={[styles.contactEmail, { color: theme.colors.primary }]}>
                📧 hello@bitsleuth.ai
              </Text>
            </TouchableOpacity>
          </Section>

          <View style={styles.footer}>
            <Text style={[styles.copyright, { color: theme.colors.textSecondary }]}>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
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
  lastUpdated: {
    fontSize: 16,
    fontWeight: '500',
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    textAlign: 'left',
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
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  copyright: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
