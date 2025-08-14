import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Plus, Download, ArrowLeft } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useWallet } from '@/hooks/wallet-store';

export default function WalletSetupScreen() {
  const { theme, createWallet, importWallet } = useWallet();
  const [mode, setMode] = useState<'select' | 'create' | 'import'>('select');
  const [walletName, setWalletName] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const openLink = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        // On web, open in new tab
        Linking.openURL(url);
      } else {
        // On mobile, use in-app browser
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          controlsColor: theme.colors.primary,
        });
      }
    } catch (error) {
      console.error('Failed to open link:', error);
      // Fallback to system browser
      Linking.openURL(url);
    }
  };

  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert(
        'Feature Not Available',
        'Wallet creation is not available on web in Expo Go. Please open this app on a mobile device using the QR code to create or import a wallet.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    try {
      await createWallet(walletName.trim());
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }

    if (!mnemonic.trim()) {
      Alert.alert('Error', 'Please enter your recovery phrase');
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert(
        'Feature Not Available',
        'Wallet import is not available on web in Expo Go. Please open this app on a mobile device using the QR code to create or import a wallet.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    try {
      await importWallet(walletName.trim(), mnemonic.trim());
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to import wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSelectMode = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Welcome to BitSleuth Wallet
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Create a new wallet or import an existing one to get started
        </Text>
      </View>

      <View style={styles.options}>
        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setMode('create')}
        >
          <Plus color="white" size={24} />
          <Text style={styles.optionButtonText}>Create New Wallet</Text>
          <Text style={styles.optionButtonSubtext}>
            Generate a new Bitcoin wallet with recovery phrase
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => setMode('import')}
        >
          <Download color={theme.colors.text} size={24} />
          <Text style={[styles.optionButtonText, { color: theme.colors.text }]}>
            Import Existing Wallet
          </Text>
          <Text style={[styles.optionButtonSubtext, { color: theme.colors.textSecondary }]}>
            Restore wallet using your recovery phrase
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.termsContainer}>
        <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
          By continuing you agree to our{' '}
          <Text 
            style={[styles.termsLink, { color: theme.colors.primary }]}
            onPress={() => openLink('https://www.bitsleuth.ai/terms-of-service')}
          >
            Terms
          </Text>
          {' '}and{' '}
          <Text 
            style={[styles.termsLink, { color: theme.colors.primary }]}
            onPress={() => openLink('https://www.bitsleuth.ai/privacy-policy')}
          >
            Privacy
          </Text>
          . Only public blockchain data is used.
        </Text>
      </View>

      {Platform.OS === 'web' && (
        <View style={[styles.webNotice, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.webNoticeText, { color: theme.colors.textSecondary }]}>
            💡 For full functionality, scan the QR code to open this app on your mobile device
          </Text>
        </View>
      )}
    </View>
  );

  const renderCreateMode = () => (
    <ScrollView style={styles.content}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setMode('select')}
      >
        <ArrowLeft color={theme.colors.text} size={24} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Create New Wallet
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Enter a name for your new Bitcoin wallet
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Wallet Name
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border
          }]}
          value={walletName}
          onChangeText={setWalletName}
          placeholder="My Bitcoin Wallet"
          placeholderTextColor={theme.colors.textSecondary}
        />

        <TouchableOpacity
          style={[styles.submitButton, { 
            backgroundColor: theme.colors.primary,
            opacity: isLoading ? 0.6 : 1
          }]}
          onPress={handleCreateWallet}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Creating...' : 'Create Wallet'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderImportMode = () => (
    <ScrollView style={styles.content}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setMode('select')}
      >
        <ArrowLeft color={theme.colors.text} size={24} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Import Wallet
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Enter your wallet name and recovery phrase
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Wallet Name
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border
          }]}
          value={walletName}
          onChangeText={setWalletName}
          placeholder="My Bitcoin Wallet"
          placeholderTextColor={theme.colors.textSecondary}
        />

        <Text style={[styles.label, { color: theme.colors.text }]}>
          Recovery Phrase (12 or 24 words)
        </Text>
        <TextInput
          style={[styles.textArea, { 
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border
          }]}
          value={mnemonic}
          onChangeText={setMnemonic}
          placeholder="Enter your recovery phrase separated by spaces"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitButton, { 
            backgroundColor: theme.colors.primary,
            opacity: isLoading ? 0.6 : 1
          }]}
          onPress={handleImportWallet}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Importing...' : 'Import Wallet'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {mode === 'select' && renderSelectMode()}
      {mode === 'create' && renderCreateMode()}
      {mode === 'import' && renderImportMode()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  options: {
    gap: 16,
  },
  optionButton: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginTop: 12,
    marginBottom: 8,
  },
  optionButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  webNotice: {
    marginTop: 40,
    padding: 16,
    borderRadius: 12,
  },
  webNoticeText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    minHeight: 120,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  termsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
});