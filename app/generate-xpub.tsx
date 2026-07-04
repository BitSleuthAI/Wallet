import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { PressableOpacity } from '@/components/PressableOpacity';
import { GradientBackground } from '@/components/GradientBackground';
import PinVerificationScreen from '@/components/PinVerificationScreen';
import { platformStyles } from '@/constants/themes';
import { useTheme } from '@/hooks/theme-store';
import { useWallets } from '@/hooks/wallet-contexts';
import * as Clipboard from 'expo-clipboard';
import { Stack, router } from 'expo-router';
import { AlertTriangle, ArrowLeft, Copy } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function GenerateXPUBScreen() {
  const { currentWallet } = useWallets();
  const { theme } = useTheme();
  const [copied, setCopied] = useState<boolean>(false);
  const [isPinVerified, setIsPinVerified] = useState<boolean>(false);

  const handleCopyXPUB = async () => {
    if (!currentWallet?.xpub) return;
    
    try {
      await Clipboard.setStringAsync(currentWallet.xpub);
      setCopied(true);
      
      if (Platform.OS !== 'web') {
        // Only show alert on mobile
        Alert.alert('Copied!', 'XPUB has been copied to clipboard');
      }
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy XPUB:', error);
      Alert.alert('Error', 'Failed to copy XPUB to clipboard');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handlePinSuccess = () => {
    setIsPinVerified(true);
  };

  if (!isPinVerified) {
    return (
      <GradientBackground theme={theme} variant="primary">
        <AndroidSafeContainer style={styles.container} enableBottomPadding={false}>
          <Stack.Screen
            options={{
              headerShown: false,
            }}
          />
          <PinVerificationScreen
            title="Extended Public Key (XPUB)"
            subtitle="Confirm your PIN to view your XPUB."
            onSuccess={handlePinSuccess}
            onBack={handleGoBack}
          />
        </AndroidSafeContainer>
      </GradientBackground>
    );
  }

  if (!currentWallet) {
    return (
      <GradientBackground theme={theme} variant="primary">
        <AndroidSafeContainer style={styles.container} enableBottomPadding={false}>
          <Stack.Screen
            options={{
              headerShown: false,
            }}
          />
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.colors.text }]}>
              No wallet found. Please create or import a wallet first.
            </Text>
          </View>
        </AndroidSafeContainer>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground theme={theme} variant="primary">
      <AndroidSafeContainer style={styles.container} enableBottomPadding={false}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
      
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <PressableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          testID="back-button"
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </PressableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Extended Public Key (XPUB)
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Code Section */}
        <View style={styles.qrContainer}>
          <View style={[styles.qrWrapper, { backgroundColor: '#FFFFFF' }]}>
            <QRCode
              value={currentWallet.xpub}
              size={200}
              color="#000000"
              backgroundColor="#FFFFFF"
              testID="xpub-qr-code"
            />
          </View>
        </View>

        {/* XPUB Text Section */}
        <View style={styles.xpubContainer}>
          <TextInput
            style={[
              styles.xpubText,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            value={currentWallet.xpub}
            multiline
            editable={false}
            selectTextOnFocus
            testID="xpub-text"
            underlineColorAndroid="transparent"
          />
        </View>

        {/* Copy Button */}
        <PressableOpacity
          style={[
            styles.copyButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={handleCopyXPUB}
          testID="copy-xpub-button"
        >
          <Copy size={20} color={theme.colors.text} />
          <Text style={[styles.copyButtonText, { color: theme.colors.text }]}>
            {copied ? 'Copied!' : 'Copy XPUB'}
          </Text>
        </PressableOpacity>

        {/* Privacy Warning */}
        <View style={[styles.warningContainer, { backgroundColor: theme.colors.error + '15', borderColor: theme.colors.error + '40' }]}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={20} color={theme.colors.error} />
            <Text style={[styles.warningTitle, { color: theme.colors.error }]}>
              Privacy Warning!
            </Text>
          </View>
          <Text style={[styles.warningText, { color: theme.colors.text }]}>
            Sharing your XPUB allows anyone to monitor your entire wallet&apos;s transaction history (past, present, and future). Only share this with services you fully trust.
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
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 32, // Compensate for back button
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  qrWrapper: {
    padding: 20,
    borderRadius: 16,
    ...platformStyles.buttonShadow,
  },
  xpubContainer: {
    width: '100%',
    marginBottom: 24,
  },
  xpubText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    textAlignVertical: 'top',
    minHeight: 120,
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
    width: '100%',
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    ...platformStyles.shadow,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
});