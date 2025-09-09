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

export default function LegalDisclaimerScreen() {
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
          title: 'Legal Disclaimer',
          headerBackTitle: '',
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            color: theme.colors.text,
          },
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
              Legal Disclaimer
            </Text>
            <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary }]}>
              Last Updated: 9 September 2025
            </Text>
          </View>

          <Text style={[styles.introText, { color: theme.colors.text }]}>
            Bitsleuth Wallet ("the App") is provided by Bitsleuth as a non-custodial, privacy-first Bitcoin wallet. By using the App, you acknowledge and agree to the following:
          </Text>

          <Section title="1. No Custody or Recovery">
            <BulletPoint text="Bitsleuth does not hold, manage, or have access to your private keys or funds." />
            <BulletPoint text="You are solely responsible for safeguarding your recovery phrase and private keys." />
            <BulletPoint text="If you lose access to your keys, your Bitcoin may be permanently unrecoverable. Bitsleuth cannot restore lost access." />
          </Section>

          <Section title="2. No Financial, Investment, or Legal Advice">
            <BulletPoint text="The App does not provide financial, investment, trading, or legal advice." />
            <BulletPoint text="Any tools, information, or features within the App are provided for general informational purposes only." />
            <BulletPoint text="You should consult with a qualified professional before making financial or investment decisions." />
          </Section>

          <Section title="3. No Liability for Transactions">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Bitcoin transactions are irreversible. Once submitted to the blockchain, they cannot be cancelled, modified, or refunded.
            </Text>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Bitsleuth has no control over the Bitcoin network and is not responsible for delays, errors, or losses resulting from its operation.
            </Text>
          </Section>

          <Section title="4. Crash Analytics">
            <BulletPoint text="The App may collect anonymous crash logs and diagnostic information to improve performance and stability." />
            <BulletPoint text="This data does not include personal information, wallet addresses, or transaction details." />
          </Section>

          <Section title="5. No Warranty">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              The App is provided on an "as is" and "as available" basis without any warranties, express or implied. We do not guarantee that the App will always function without errors, bugs, or interruptions.
            </Text>
          </Section>

          <Section title="6. Limitation of Liability">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              To the fullest extent permitted by law, Bitsleuth is not liable for:
            </Text>
            <BulletPoint text="Any direct or indirect losses, including loss of funds or data." />
            <BulletPoint text="Any damages resulting from reliance on information provided in the App." />
            <BulletPoint text="Any consequences of user error, device failure, or misuse of the App." />
          </Section>

          <Section title="7. Compliance with Laws">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              You are responsible for ensuring that your use of the App complies with all applicable laws and regulations in your jurisdiction.
            </Text>
          </Section>

          <Section title="8. Updates">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              We may update this Disclaimer periodically. Continued use of the App after updates are published constitutes acceptance of the revised Disclaimer.
            </Text>
          </Section>

          <Section title="9. Contact Us">
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              If you have questions about this Disclaimer, please contact us:
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
