// Import crypto polyfill first
import '@/services/crypto-polyfill';
import { PressableOpacity } from '@/components/PressableOpacity';

import { GradientBackground } from '@/components/GradientBackground';
import QRScanner from '@/components/QRScanner';
import { platformStyles } from '@/constants/themes';
import { WALLET_COLOR_PALETTE } from '@/constants/wallet-colors';
import { useAutoLock } from '@/hooks/auto-lock-store';
import { useWallet } from '@/hooks/wallet-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Copy, Download, Plus, QrCode, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Clipboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import type { WalletService } from '@/types/wallet';

// Wallet service import with platform detection
let walletService: WalletService;
try {
  if (__DEV__) {
    console.log('📦 Loading wallet service for platform:', Platform.OS);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const importedService = require('@/services/wallet-service');
  
  if (__DEV__) {
    console.log('📦 Imported service keys:', Object.keys(importedService));
  }
  
  // Ensure functions are properly bound and accessible
  walletService = {
    generateMnemonic: importedService.generateMnemonic,
    validateMnemonic: importedService.validateMnemonic,
    createWallet: importedService.createWallet,
    importWallet: importedService.importWallet
  };
  
  // Verify all required functions are available
  const requiredFunctions: (keyof WalletService)[] = ['generateMnemonic', 'validateMnemonic', 'createWallet', 'importWallet'];
  const missingFunctions = requiredFunctions.filter(func => typeof walletService[func] !== 'function');
  
  if (missingFunctions.length > 0) {
    throw new Error(`Missing wallet service functions: ${missingFunctions.join(', ')}`);
  }
  
  if (__DEV__) {
    console.log('✅ Wallet service loaded successfully for', Platform.OS);
  }
} catch (error) {
  console.error('❌ Failed to load wallet service for', Platform.OS, ':', error);
  // Fail closed: never hand out a predictable mnemonic or accept an invalid
  // one just because the crypto module failed to load
  const serviceUnavailable = async (): Promise<never> => {
    throw new Error('Wallet service not available. Please restart the app.');
  };
  walletService = {
    generateMnemonic: serviceUnavailable,
    validateMnemonic: () => false,
    createWallet: serviceUnavailable,
    importWallet: serviceUnavailable,
  };
}

export default function WalletSetupScreen() {
  const { theme, importWallet } = useWallet();
  const { hasPin, biometricEnabled } = useAutoLock();
  const [mode, setMode] = useState<'select' | 'create' | 'import' | 'confirm'>('select');
  const [walletName, setWalletName] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [selectedColor, setSelectedColor] = useState(WALLET_COLOR_PALETTE[0].base);
  const [isLoading, setIsLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [showWordCountDropdown, setShowWordCountDropdown] = useState(false);
  const [hasStoredPhrase, setHasStoredPhrase] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmationWords, setConfirmationWords] = useState<{word: string, position: number}[]>([]);
  const [userInputs, setUserInputs] = useState<string[]>(['', '']);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Ref to store clipboard timeout for cleanup
  const clipboardTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup clipboard timeout on unmount
  useEffect(() => {
    return () => {
      if (clipboardTimeoutRef.current) {
        clearTimeout(clipboardTimeoutRef.current);
      }
    };
  }, []);

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

  const generateNewMnemonic = useCallback(async () => {
    if (__DEV__) {
      console.log('Starting mnemonic generation for word count:', wordCount);
    }

    try {
      if (typeof walletService.generateMnemonic !== 'function') {
        throw new Error('generateMnemonic is not a function');
      }

      const strength = wordCount === 24 ? 256 : 128;

      // Handle both sync and async versions of generateMnemonic
      let newMnemonic: string;
      const result = walletService.generateMnemonic(strength);
      if (result instanceof Promise) {
        newMnemonic = await result;
      } else {
        newMnemonic = result;
      }

      if (!newMnemonic || typeof newMnemonic !== 'string' || !newMnemonic.trim()) {
        throw new Error('Generated mnemonic was empty');
      }

      if (__DEV__) {
        console.log('Successfully generated mnemonic with wallet service');
      }

      setGeneratedMnemonic(newMnemonic);
    } catch (error) {
      console.error('Error generating mnemonic:', error);
      // Fail closed: never substitute a publicly-known test phrase.
      // An empty mnemonic blocks wallet creation until generation succeeds.
      setGeneratedMnemonic('');
      Alert.alert(
        'Unable to Generate Recovery Phrase',
        'Secure key generation failed, so no wallet was created. Please restart the app and try again.',
        [{ text: 'OK' }]
      );
    }
  }, [wordCount]);

  useEffect(() => {
    if (mode === 'create') {
      generateNewMnemonic();
    }
  }, [mode, wordCount, generateNewMnemonic]);

  const copyToClipboard = async () => {
    // Clear any existing timeout
    if (clipboardTimeoutRef.current) {
      clearTimeout(clipboardTimeoutRef.current);
    }
    
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(generatedMnemonic);
        Alert.alert(
          'Copied',
          'Recovery phrase copied to clipboard. It will be cleared automatically in 60 seconds for security.'
        );
      } catch {
        Alert.alert('Error', 'Failed to copy to clipboard');
        return;
      }
    } else {
      Clipboard.setString(generatedMnemonic);
      Alert.alert(
        'Copied',
        'Recovery phrase copied to clipboard. It will be cleared automatically in 60 seconds for security.'
      );
    }
    
    // Auto-clear clipboard after 60 seconds for security
    clipboardTimeoutRef.current = setTimeout(() => {
      if (Platform.OS !== 'web') {
        Clipboard.setString('');
      }
      // Note: Cannot reliably clear web clipboard, but user was informed
    }, 60000);
  };

  // Check if create wallet form is valid
  const isCreateFormValid = walletName.trim() && hasStoredPhrase && acceptedTerms;

  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }

    if (!hasStoredPhrase) {
      Alert.alert('Error', 'Please confirm that you have securely stored your recovery phrase');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Error', 'Please accept the Terms to continue');
      return;
    }

    // Move to confirmation page instead of creating wallet immediately
    if (!generatedMnemonic || typeof generatedMnemonic !== 'string') {
      Alert.alert('Error', 'No recovery phrase generated. Please try again.');
      return;
    }
    
    const words = generatedMnemonic.split(' ').filter(word => word.trim());
    if (words.length === 0) {
      Alert.alert('Error', 'No recovery phrase generated. Please try again.');
      return;
    }
    const randomPositions: number[] = [];
    
    // Generate 2 random positions based on word count
    while (randomPositions.length < 2) {
      const randomPos = Math.floor(Math.random() * words.length) + 1;
      if (!randomPositions.includes(randomPos)) {
        randomPositions.push(randomPos);
      }
    }
    
    const confirmWords = randomPositions.map(pos => ({
      word: words[pos - 1],
      position: pos
    }));
    
    setConfirmationWords(confirmWords);
    setUserInputs(['', '']);
    setMode('confirm');
  };

  // Check if import wallet form is valid
  const isImportFormValid = walletName.trim() && mnemonic.trim();

  const handleImportWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }

    if (!mnemonic.trim()) {
      Alert.alert('Error', 'Please enter your recovery phrase');
      return;
    }

    if (__DEV__) {
      console.log('Starting wallet import process...');
      console.log('Wallet name:', walletName.trim());
      // DO NOT log the actual mnemonic - only metadata
      console.log('Mnemonic word count:', mnemonic.trim().split(/\s+/).filter(word => word.length > 0).length);
      console.log('Platform:', Platform.OS);
    }

    setIsLoading(true);
    try {
      // First validate the mnemonic manually for debugging
      if (__DEV__) {
        console.log('Wallet service validateMnemonic type:', typeof walletService.validateMnemonic);
      }
      
      if (typeof walletService.validateMnemonic !== 'function') {
        throw new Error('validateMnemonic is not a function');
      }
      
      const isValid = walletService.validateMnemonic(mnemonic.trim());
      
      if (__DEV__) {
        console.log('Manual validation result:', isValid);
      }
      
      if (!isValid) {
        if (__DEV__) {
          console.log('Mnemonic validation failed, but proceeding anyway for debugging...');
        }
      }
      
      const result = await importWallet(walletName.trim(), mnemonic.trim(), selectedColor);
      
      if (!result.success) {
        // Show error message without throwing
        Alert.alert('Error', result.error);
        setIsLoading(false);
        return;
      }
      
      // Show confetti celebration
      setShowConfetti(true);
      
      // Wait 2 seconds for confetti celebration, then navigate appropriately
      setTimeout(function() {
        (async function() {
          setShowConfetti(false);
          // If this is the first wallet, go to PIN setup
          // If PIN already exists but biometric not set up, go to biometric setup
          // If both PIN and biometric are set up, go directly to tabs
          if (hasPin) {
            if (biometricEnabled) {
              router.replace('/(tabs)');
            } else {
              // Check if biometric was ever enabled in the past
              const biometricWasEverEnabled = await AsyncStorage.getItem('biometricEnabled');
              if (biometricWasEverEnabled === 'true') {
                // Biometric was previously enabled, skip setup and go to tabs
                router.replace('/(tabs)');
              } else {
                // Biometric was never enabled, go to setup
                router.push('/biometric-setup');
              }
            }
          } else {
            router.push('/pin-setup');
          }
        })();
      }, 2000);
    } catch (error) {
      console.error('Unexpected error during wallet import:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const renderSelectMode = () => (
    <ScrollView 
      style={styles.content}
      contentContainerStyle={[
        styles.scrollContent,
        Platform.OS === 'android' && { paddingBottom: 100 }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <PressableOpacity
        style={styles.backToDashboardButton}
        onPress={() => router.replace('/(tabs)')}
      >
        <ArrowLeft color={theme.colors.text} size={20} />
        <Text style={[styles.backToDashboardText, { color: theme.colors.text }]}>
          Back to Dashboard
        </Text>
      </PressableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Welcome to BitSleuth Wallet
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Create a new wallet or import an existing one to get started
        </Text>
      </View>

      {/* Bitcoin Wallet Types Educational Section */}
      <View style={[styles.walletTypeEducationCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.walletTypeEducationHeader}>
          <View style={[styles.walletTypeEducationIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.walletTypeEducationEmoji, { color: theme.colors.primary }]}>₿</Text>
          </View>
          <Text style={[styles.walletTypeEducationTitle, { color: theme.colors.text }]}>
            What Type of Bitcoin Wallet?
          </Text>
        </View>
        <Text style={[styles.walletTypeEducationDescription, { color: theme.colors.textSecondary }]}>
          BitSleuth uses Native SegWit (P2WPKH) wallets, which offer the best combination of security, efficiency, and future compatibility:
        </Text>
        <View style={styles.walletTypeEducationPoints}>
          <Text style={[styles.walletTypeEducationPoint, { color: theme.colors.textSecondary }]}>
            • <Text style={{ fontWeight: '600' }}>Lower Fees:</Text> SegWit transactions cost ~40% less than legacy addresses
          </Text>
          <Text style={[styles.walletTypeEducationPoint, { color: theme.colors.textSecondary }]}>
            • <Text style={{ fontWeight: '600' }}>Modern Standard:</Text> Uses Bech32 format (bc1q...) addresses
          </Text>
          <Text style={[styles.walletTypeEducationPoint, { color: theme.colors.textSecondary }]}>
            • <Text style={{ fontWeight: '600' }}>Better Security:</Text> Signature data is separated from transaction data
          </Text>
          <Text style={[styles.walletTypeEducationPoint, { color: theme.colors.textSecondary }]}>
            • <Text style={{ fontWeight: '600' }}>Future-Proof:</Text> Fully compatible with Lightning Network and Layer 2 solutions
          </Text>
        </View>
        <View style={styles.walletTypeEducationNote}>
          <Text style={[styles.walletTypeEducationNoteText, { color: theme.colors.textSecondary }]}>
            💡 <Text style={{ fontWeight: '600' }}>Did you know?</Text> Native SegWit wallets are the modern standard recommended by Bitcoin Core
          </Text>
        </View>
      </View>

      <View style={styles.options}>
        <PressableOpacity
          style={[styles.optionButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setMode('create')}
        >
          <Plus color="white" size={24} />
          <Text style={styles.optionButtonText}>Create New Wallet</Text>
          <Text style={styles.optionButtonSubtext}>
            Generate a new Bitcoin wallet with recovery phrase
          </Text>
        </PressableOpacity>

        <PressableOpacity
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
        </PressableOpacity>
      </View>

      <View style={styles.termsContainer}>
        <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
          By continuing you agree to our{' '}
          <Text 
            style={[styles.termsLink, { color: theme.colors.primary }]}
            onPress={() => router.push('/terms-of-service')}
          >
            Terms
          </Text>
          {' '}and{' '}
          <Text 
            style={[styles.termsLink, { color: theme.colors.primary }]}
            onPress={() => router.push('/privacy-policy')}
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
    </ScrollView>
  );

  const handleBackFromCreate = () => {
    setMode('select');
  };

  const renderCreateMode = () => (
    <ScrollView 
      style={styles.content}
      contentContainerStyle={[
        styles.scrollContent,
        Platform.OS === 'android' && { paddingBottom: 100 }
      ]}
    >
      <PressableOpacity
        style={styles.backButton}
        onPress={handleBackFromCreate}
        activeOpacity={0.7}
      >
        <ArrowLeft color={theme.colors.text} size={24} />
      </PressableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Create Wallet
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Select 12 or 24 word generation, enter your wallet name and select a color
        </Text>
        <View style={styles.wordCountSelector}>
          <PressableOpacity
            style={[styles.wordCountButton, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }]}
            onPress={() => setShowWordCountDropdown(!showWordCountDropdown)}
            activeOpacity={0.7}
          >
            <Text style={[styles.wordCountText, { color: theme.colors.text }]}>
              {wordCount} words
            </Text>
            <ChevronDown color={theme.colors.text} size={16} />
          </PressableOpacity>
        </View>
        {showWordCountDropdown && (
          <View style={[styles.dropdownOverlay, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }]}>
            <PressableOpacity
              style={[styles.dropdownItem, wordCount === 12 && { backgroundColor: theme.colors.primary + '20' }]}
              onPress={() => {
                setWordCount(12);
                setShowWordCountDropdown(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownText, { color: theme.colors.text }]}>12 words</Text>
              {wordCount === 12 && <Check color={theme.colors.primary} size={16} />}
            </PressableOpacity>
            <PressableOpacity
              style={[styles.dropdownItem, wordCount === 24 && { backgroundColor: theme.colors.primary + '20' }]}
              onPress={() => {
                setWordCount(24);
                setShowWordCountDropdown(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownText, { color: theme.colors.text }]}>24 words</Text>
              {wordCount === 24 && <Check color={theme.colors.primary} size={16} />}
            </PressableOpacity>
          </View>
        )}
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
          underlineColorAndroid="transparent"
        />

        <Text style={[styles.label, { color: theme.colors.text }]}>
          Color
        </Text>
        <View style={styles.colorPicker}>
          {WALLET_COLOR_PALETTE.map((colorOption) => (
            <PressableOpacity
              key={colorOption.id}
              style={styles.colorOptionContainer}
              onPress={() => setSelectedColor(colorOption.base)}
            >
              <LinearGradient
                colors={colorOption.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.colorOption}
              >
                {selectedColor === colorOption.base && (
                  <Check color="white" size={20} />
                )}
              </LinearGradient>
            </PressableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.text }]}>
          Recovery Phrase
        </Text>
        <View style={[styles.mnemonicContainer, { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          minHeight: wordCount === 24 ? 400 : 200
        }]}>
          <View style={[styles.mnemonicGrid, { 
            flexDirection: wordCount === 24 ? 'row' : 'row',
            flexWrap: 'wrap'
          }]}>
            {(generatedMnemonic || '').split(' ').filter(word => word.trim()).map((word, index) => (
              <View key={index} style={[styles.wordItem, { 
                backgroundColor: theme.colors.background,
                width: wordCount === 24 ? '31%' : '48%'
              }]}>
                <Text style={[styles.wordNumber, { color: theme.colors.textSecondary }]}>
                  {index + 1}
                </Text>
                <Text style={[styles.wordText, { color: theme.colors.text }]}>
                  {word}
                </Text>
              </View>
            ))}
          </View>
          <PressableOpacity
            style={[styles.copyButton, { backgroundColor: theme.colors.primary }]}
            onPress={copyToClipboard}
            accessibilityRole="button"
            accessibilityLabel="Copy recovery phrase"
            accessibilityHint="Copies the recovery phrase to clipboard for 60 seconds"
          >
            <Copy color="white" size={16} />
            <Text style={styles.copyButtonText}>Copy</Text>
          </PressableOpacity>
        </View>

        <View style={[styles.backupWarning, { 
          backgroundColor: theme.colors.error + '20',
          borderColor: theme.colors.error
        }]}>
          <AlertTriangle color={theme.colors.error} size={20} />
          <View style={styles.warningContent}>
            <Text style={[styles.warningTitle, { color: theme.colors.error }]}>
              Backup Warning: Final Step
            </Text>
            <Text style={[styles.warningText, { color: theme.colors.text }]}>
              This is the only time you will see your recovery phrase. Write it down and store it in a safe, offline location. If you lose this phrase, you will lose access to your funds forever.
            </Text>
          </View>
        </View>

        <View style={styles.checkboxContainer}>
          <PressableOpacity
            style={[styles.checkbox, { borderColor: theme.colors.border }]}
            onPress={() => setHasStoredPhrase(!hasStoredPhrase)}
            accessibilityRole="checkbox"
            accessibilityLabel="I have securely stored my recovery phrase"
            accessibilityHint="Double tap to confirm you have safely stored your recovery phrase"
            accessibilityState={{ checked: hasStoredPhrase }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {hasStoredPhrase && (
              <Check color={theme.colors.primary} size={16} />
            )}
          </PressableOpacity>
          <Text style={[styles.checkboxText, { color: theme.colors.text }]}>
            I have securely stored my recovery phrase
          </Text>
        </View>

        <View style={styles.checkboxContainer}>
          <PressableOpacity
            style={[styles.checkbox, { borderColor: theme.colors.border }]}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            accessibilityRole="checkbox"
            accessibilityLabel="I accept the Terms of Service and Privacy Policy"
            accessibilityHint="Double tap to toggle acceptance of terms and conditions"
            accessibilityState={{ checked: acceptedTerms }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {acceptedTerms && (
              <Check color={theme.colors.primary} size={16} />
            )}
          </PressableOpacity>
          <Text style={[styles.checkboxText, { color: theme.colors.text }]}>
            I accept the{' '}
            <Text 
              style={[styles.termsLink, { color: theme.colors.primary }]}
              onPress={() => router.push('/terms-of-service')}
            >
              Terms
            </Text>
            {'. '}
          </Text>
        </View>

        <PressableOpacity
          style={[styles.submitButton, { 
            backgroundColor: isCreateFormValid ? theme.colors.primary : theme.colors.primary + '40',
            opacity: isLoading ? 0.6 : 1
          }]}
          onPress={handleCreateWallet}
          disabled={isLoading || !isCreateFormValid}
        >
          <Text style={[styles.submitButtonText, {
            color: isCreateFormValid ? 'white' : 'rgba(255, 255, 255, 0.6)'
          }]}>
            {isLoading ? 'Creating...' : 'Confirm'}
          </Text>
        </PressableOpacity>

        <PressableOpacity
          style={styles.helpLinkContainer}
          onPress={() => openLink('https://www.bitsleuth.ai/glossary/passphrase')}
        >
          <Text style={[styles.helpLinkText, { color: theme.colors.primary }]}>
            What is a recovery phrase?
          </Text>
        </PressableOpacity>
      </View>
    </ScrollView>
  );

  const renderImportMode = () => (
    <KeyboardAvoidingView 
      style={styles.flex1}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <PressableOpacity
        style={styles.backButton}
        onPress={() => {
          console.log('Import back button pressed');
          if (router.canGoBack()) {
            router.back();
          } else {
            setMode('select');
          }
        }}
        activeOpacity={0.7}
      >
        <ArrowLeft color={theme.colors.text} size={24} />
      </PressableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Import Wallet
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Enter your wallet name, select a color and recovery phrase
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
          underlineColorAndroid="transparent"
        />

        <Text style={[styles.label, { color: theme.colors.text }]}>
          Color
        </Text>
        <View style={styles.colorPicker}>
          {WALLET_COLOR_PALETTE.map((colorOption) => (
            <PressableOpacity
              key={colorOption.id}
              style={styles.colorOptionContainer}
              onPress={() => setSelectedColor(colorOption.base)}
            >
              <LinearGradient
                colors={colorOption.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.colorOption}
              >
                {selectedColor === colorOption.base && (
                  <Check color="white" size={20} />
                )}
              </LinearGradient>
            </PressableOpacity>
          ))}
        </View>

        <View style={styles.recoveryPhraseSection}>
          <View style={styles.recoveryPhraseHeader}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Recovery Phrase (12 or 24 words)
            </Text>
            <PressableOpacity 
              style={[styles.scanQrButton, { borderColor: theme.colors.border }]}
              onPress={() => {
                if (Platform.OS === 'web') {
                  Alert.alert('Feature Not Available', 'QR scanning is not available on web. Please use the mobile app.');
                } else {
                  setShowQRScanner(true);
                }
              }}
            >
              <QrCode color={theme.colors.text} size={16} />
              <Text style={[styles.scanQrText, { color: theme.colors.text }]}>Scan QR</Text>
            </PressableOpacity>
          </View>
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
            underlineColorAndroid="transparent"
          />
          <Text style={[styles.securityMessage, { color: theme.colors.textSecondary }]}>
            We never send your recovery phrase anywhere. It only lives in your device.
          </Text>
        </View>

        <PressableOpacity
          style={[styles.submitButton, { 
            backgroundColor: isImportFormValid ? theme.colors.primary : theme.colors.primary + '40',
            opacity: isLoading ? 0.6 : 1
          }]}
          onPress={handleImportWallet}
          disabled={isLoading || !isImportFormValid}
          accessibilityRole="button"
          accessibilityLabel="Import wallet"
          accessibilityHint="Imports your existing wallet using the recovery phrase"
          accessibilityState={{ 
            disabled: isLoading || !isImportFormValid,
            busy: isLoading 
          }}
        >
          <Text style={[styles.submitButtonText, {
            color: isImportFormValid ? 'white' : 'rgba(255, 255, 255, 0.6)'
          }]}>
            {isLoading ? 'Importing...' : 'Import Wallet'}
          </Text>
        </PressableOpacity>

        <PressableOpacity
          style={styles.helpLinkContainer}
          onPress={() => openLink('https://www.bitsleuth.ai/glossary/passphrase')}
          accessibilityRole="link"
          accessibilityLabel="Learn about recovery phrases"
          accessibilityHint="Opens help article about Bitcoin recovery phrases"
        >
          <Text style={[styles.helpLinkText, { color: theme.colors.primary }]}>
            What is a recovery phrase?
          </Text>
        </PressableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const handleQRScan = (data: string) => {
    console.log('QR scan result:', data);
    setMnemonic(data);
    setShowQRScanner(false);
  };

  const handleConfirmationInput = (index: number, value: string) => {
    const newInputs = [...userInputs];
    newInputs[index] = value.toLowerCase().trim();
    setUserInputs(newInputs);
  };

  const handleConfirmRecoveryPhrase = async () => {
    // Check if both words are correct
    const isValid = confirmationWords.every((confirmWord, index) => 
      userInputs[index] === confirmWord.word.toLowerCase()
    );

    if (!isValid) {
      Alert.alert('Incorrect Words', 'Please check the words you entered and try again.');
      return;
    }

    // Show confetti and create wallet
    setShowConfetti(true);
    
    // Wait a moment for confetti to show
    setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await importWallet(walletName.trim(), generatedMnemonic, selectedColor);
        
        if (!result.success) {
          // Show error message without throwing
          Alert.alert('Error', result.error);
          setIsLoading(false);
          setShowConfetti(false);
          return;
        }
        
        // If this is the first wallet, go to PIN setup
        // If PIN already exists but biometric not set up, go to biometric setup
        // If both PIN and biometric are set up, go directly to tabs
        if (hasPin) {
          if (biometricEnabled) {
            router.replace('/(tabs)');
          } else {
            // Check if biometric was ever enabled in the past
            const biometricWasEverEnabled = await AsyncStorage.getItem('biometricEnabled');
            if (biometricWasEverEnabled === 'true') {
              // Biometric was previously enabled, skip setup and go to tabs
              router.replace('/(tabs)');
            } else {
              // Biometric was never enabled, go to setup
              router.push('/biometric-setup');
            }
          }
        } else {
          router.push('/pin-setup');
        }
      } catch (error) {
        console.error('Unexpected error during wallet creation:', error);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
        setShowConfetti(false);
      }
    }, 2000);
  };

  const renderConfirmMode = () => (
    <ScrollView style={styles.content}>
      <PressableOpacity
        style={styles.backButton}
        onPress={() => setMode('create')}
        activeOpacity={0.7}
      >
        <ArrowLeft color={theme.colors.text} size={24} />
      </PressableOpacity>

      <View style={styles.header}>
        <View style={[styles.successIcon, { backgroundColor: theme.colors.primary + '20' }]}>
          <Sparkles color={theme.colors.primary} size={32} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Confirm Recovery Phrase
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Please enter the following words from your recovery phrase to confirm you have saved it correctly.
        </Text>
      </View>

      <View style={styles.form}>
        {confirmationWords.map((confirmWord, index) => (
          <View key={index} style={styles.confirmationWordContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Word #{confirmWord.position}
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }]}
              value={userInputs[index]}
              onChangeText={(value) => handleConfirmationInput(index, value)}
              placeholder={`Enter word #${confirmWord.position}`}
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              underlineColorAndroid="transparent"
            />
          </View>
        ))}

        <PressableOpacity
          style={[styles.submitButton, { 
            backgroundColor: theme.colors.primary,
            opacity: isLoading ? 0.6 : 1
          }]}
          onPress={handleConfirmRecoveryPhrase}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Create wallet"
          accessibilityHint="Confirms the recovery phrase and creates your new Bitcoin wallet"
          accessibilityState={{ 
            disabled: isLoading,
            busy: isLoading 
          }}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Creating Wallet...' : 'Create Wallet'}
          </Text>
        </PressableOpacity>

        <PressableOpacity
          style={styles.helpLinkContainer}
          onPress={() => openLink('https://www.bitsleuth.ai/glossary/passphrase')}
        >
          <Text style={[styles.helpLinkText, { color: theme.colors.primary }]}>
            What is a recovery phrase?
          </Text>
        </PressableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <SafeAreaView style={[
          styles.container,
          Platform.OS === 'android' && { paddingTop: 20 }
        ]}>
          <Stack.Screen options={{ headerShown: false }} />
        
        {mode === 'select' && renderSelectMode()}
        {mode === 'create' && renderCreateMode()}
        {mode === 'import' && renderImportMode()}
        {mode === 'confirm' && renderConfirmMode()}
        
        {showConfetti && Platform.OS !== 'web' && (
          <ConfettiCannon
            count={200}
            origin={{x: -10, y: 0}}
            autoStart={true}
            fadeOut={true}
          />
        )}
        
        <Modal
          visible={showQRScanner}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <QRScanner
            onScan={handleQRScan}
            onClose={() => setShowQRScanner(false)}
          />
        </Modal>
        </SafeAreaView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: platformStyles.spacing.huge,
  },
  content: {
    flex: 1,
    paddingHorizontal: platformStyles.spacing.xl,
  },
  backButton: {
    marginTop: platformStyles.spacing.xl,
    marginBottom: platformStyles.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: platformStyles.spacing.huge,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: platformStyles.spacing.md,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
  },
  options: {
    gap: platformStyles.spacing.lg,
  },
  optionButton: {
    padding: platformStyles.spacing.xxl,
    borderRadius: platformStyles.borderRadius.xl,
    alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 19,
    fontWeight: '600',
    color: 'white',
    marginTop: platformStyles.spacing.md,
    marginBottom: platformStyles.spacing.sm,
  },
  optionButtonSubtext: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  webNotice: {
    marginTop: platformStyles.spacing.huge,
    padding: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.large,
  },
  webNoticeText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: platformStyles.spacing.xl,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: platformStyles.spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: platformStyles.borderRadius.large,
    paddingHorizontal: platformStyles.spacing.lg,
    paddingVertical: platformStyles.spacing.lg,
    fontSize: 17,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: platformStyles.borderRadius.large,
    paddingHorizontal: platformStyles.spacing.lg,
    paddingVertical: platformStyles.spacing.lg,
    fontSize: 17,
    minHeight: 120,
  },
  submitButton: {
    paddingVertical: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.large,
    alignItems: 'center',
    marginTop: platformStyles.spacing.xl,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: platformStyles.spacing.xxxl,
    paddingHorizontal: platformStyles.spacing.lg,
  },
  termsText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
  backToDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: platformStyles.spacing.xl,
    marginBottom: platformStyles.spacing.md,
    paddingVertical: platformStyles.spacing.sm,
    paddingHorizontal: 4,
  },
  backToDashboardText: {
    fontSize: 17,
    marginLeft: 8,
    fontWeight: '500',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: platformStyles.spacing.md,
    marginBottom: 8,
  },
  colorOptionContainer: {
    ...platformStyles.shadow,
    borderRadius: 30,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoveryPhraseSection: {
    gap: 8,
  },
  recoveryPhraseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scanQrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    gap: 6,
  },
  scanQrText: {
    fontSize: 14,
    fontWeight: '500',
  },
  securityMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  helpLinkContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  helpLinkText: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  wordCountSelector: {
    alignItems: 'center',
    marginTop: 16,
  },
  wordCountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  wordCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownOverlay: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    ...platformStyles.buttonShadow,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mnemonicContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    minHeight: 200,
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  wordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    marginBottom: 4,
  },
  wordNumber: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 16,
  },
  wordText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  backupWarning: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  warningContent: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
  },
  checkbox: {
    width: 24,  // Increased from 20px
    height: 24, // Increased from 20px
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  confirmationWordContainer: {
    marginBottom: 16,
  },
  walletTypeEducationCard: {
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    ...platformStyles.shadow,
  },
  walletTypeEducationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletTypeEducationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletTypeEducationEmoji: {
    fontSize: 16,
  },
  walletTypeEducationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  walletTypeEducationDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  walletTypeEducationPoints: {
    marginBottom: 12,
  },
  walletTypeEducationPoint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  walletTypeEducationNote: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  walletTypeEducationNoteText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
