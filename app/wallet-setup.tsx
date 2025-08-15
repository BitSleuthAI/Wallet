// Import crypto polyfill first
import '@/services/crypto-polyfill';

import React, { useState, useEffect } from 'react';
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
  Modal,
  Clipboard,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Plus, Download, ArrowLeft, Check, QrCode, Copy, ChevronDown, AlertTriangle, Sparkles } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useWallet } from '@/hooks/wallet-store';
import QRScanner from '@/components/QRScanner';

// Platform-specific wallet service imports
let walletService: any;
if (Platform.OS === 'web') {
  walletService = require('@/services/wallet-service.web');
} else {
  walletService = require('@/services/wallet-service');
}

export default function WalletSetupScreen() {
  const { theme, importWallet } = useWallet();
  const [mode, setMode] = useState<'select' | 'create' | 'import' | 'confirm'>('select');
  const [walletName, setWalletName] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [selectedColor, setSelectedColor] = useState('#8B5CF6');
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

  const walletColors = [
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#F97316', // Orange
    '#10B981', // Emerald
    '#3B82F6', // Blue
  ];

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

  const generateNewMnemonic = () => {
    console.log('Starting mnemonic generation for word count:', wordCount);
    
    // Use fallback immediately to avoid any potential recursion issues
    const fallback12 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const fallback24 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
    const fallbackMnemonic = wordCount === 24 ? fallback24 : fallback12;
    
    try {
      console.log('Attempting to generate mnemonic with wallet service');
      const strength = wordCount === 24 ? 256 : 128;
      const newMnemonic = walletService.generateMnemonic(strength);
      console.log('Successfully generated mnemonic with wallet service');
      setGeneratedMnemonic(newMnemonic);
    } catch (error) {
      console.error('Error generating mnemonic, using fallback:', error);
      setGeneratedMnemonic(fallbackMnemonic);
    }
  };

  useEffect(() => {
    if (mode === 'create') {
      generateNewMnemonic();
    }
  }, [mode, wordCount]);

  const copyToClipboard = async () => {
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(generatedMnemonic);
        Alert.alert('Copied', 'Recovery phrase copied to clipboard');
      } catch {
        Alert.alert('Error', 'Failed to copy to clipboard');
      }
    } else {
      Clipboard.setString(generatedMnemonic);
      Alert.alert('Copied', 'Recovery phrase copied to clipboard');
    }
  };

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
    const words = generatedMnemonic.split(' ');
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

  const handleImportWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }

    if (!mnemonic.trim()) {
      Alert.alert('Error', 'Please enter your recovery phrase');
      return;
    }



    setIsLoading(true);
    try {
      await importWallet(walletName.trim(), mnemonic.trim(), selectedColor);
      
      // Show confetti celebration
      setShowConfetti(true);
      
      // Wait 2 seconds for confetti celebration, then navigate
      setTimeout(() => {
        setShowConfetti(false);
        router.replace('/(tabs)');
      }, 2000);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to import wallet');
      setIsLoading(false);
    }
  };

  const renderSelectMode = () => (
    <View style={styles.content}>
      <TouchableOpacity
        style={styles.backToDashboardButton}
        onPress={() => router.replace('/(tabs)')}
      >
        <ArrowLeft color={theme.colors.text} size={20} />
        <Text style={[styles.backToDashboardText, { color: theme.colors.text }]}>
          Back to Dashboard
        </Text>
      </TouchableOpacity>

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

  const handleBackFromCreate = () => {
    setMode('select');
  };

  const renderCreateMode = () => (
    <ScrollView style={styles.content}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackFromCreate}
        activeOpacity={0.7}
      >
        <ArrowLeft color={theme.colors.text} size={24} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Create Wallet
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Select 12 or 24 word generation, enter your wallet name and select a color
        </Text>
        <View style={styles.wordCountSelector}>
          <TouchableOpacity
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
          </TouchableOpacity>
        </View>
        {showWordCountDropdown && (
          <View style={[styles.dropdownOverlay, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }]}>
            <TouchableOpacity
              style={[styles.dropdownItem, wordCount === 12 && { backgroundColor: theme.colors.primary + '20' }]}
              onPress={() => {
                setWordCount(12);
                setShowWordCountDropdown(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownText, { color: theme.colors.text }]}>12 words</Text>
              {wordCount === 12 && <Check color={theme.colors.primary} size={16} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownItem, wordCount === 24 && { backgroundColor: theme.colors.primary + '20' }]}
              onPress={() => {
                setWordCount(24);
                setShowWordCountDropdown(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownText, { color: theme.colors.text }]}>24 words</Text>
              {wordCount === 24 && <Check color={theme.colors.primary} size={16} />}
            </TouchableOpacity>
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
        />

        <Text style={[styles.label, { color: theme.colors.text }]}>
          Color
        </Text>
        <View style={styles.colorPicker}>
          {walletColors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[styles.colorOption, { backgroundColor: color }]}
              onPress={() => setSelectedColor(color)}
            >
              {selectedColor === color && (
                <Check color="white" size={20} />
              )}
            </TouchableOpacity>
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
            {generatedMnemonic.split(' ').map((word, index) => (
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
          <TouchableOpacity
            style={[styles.copyButton, { backgroundColor: theme.colors.primary }]}
            onPress={copyToClipboard}
          >
            <Copy color="white" size={16} />
            <Text style={styles.copyButtonText}>Copy</Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            style={[styles.checkbox, { borderColor: theme.colors.border }]}
            onPress={() => setHasStoredPhrase(!hasStoredPhrase)}
          >
            {hasStoredPhrase && (
              <Check color={theme.colors.primary} size={16} />
            )}
          </TouchableOpacity>
          <Text style={[styles.checkboxText, { color: theme.colors.text }]}>
            I have securely stored my recovery phrase
          </Text>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[styles.checkbox, { borderColor: theme.colors.border }]}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            {acceptedTerms && (
              <Check color={theme.colors.primary} size={16} />
            )}
          </TouchableOpacity>
          <Text style={[styles.checkboxText, { color: theme.colors.text }]}>
            I accept the{' '}
            <Text 
              style={[styles.termsLink, { color: theme.colors.primary }]}
              onPress={() => openLink('https://www.bitsleuth.ai/terms-of-service')}
            >
              Terms
            </Text>
            .
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { 
            backgroundColor: theme.colors.primary,
            opacity: isLoading ? 0.6 : 1
          }]}
          onPress={handleCreateWallet}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Creating...' : 'Confirm'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helpLinkContainer}
          onPress={() => openLink('https://www.bitsleuth.ai/glossary/passphrase')}
        >
          <Text style={[styles.helpLinkText, { color: theme.colors.primary }]}>
            What is a recovery phrase?
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
        />

        <Text style={[styles.label, { color: theme.colors.text }]}>
          Color
        </Text>
        <View style={styles.colorPicker}>
          {walletColors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[styles.colorOption, { backgroundColor: color }]}
              onPress={() => setSelectedColor(color)}
            >
              {selectedColor === color && (
                <Check color="white" size={20} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.recoveryPhraseSection}>
          <View style={styles.recoveryPhraseHeader}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Recovery Phrase (12 or 24 words)
            </Text>
            <TouchableOpacity 
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
            </TouchableOpacity>
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
          />
          <Text style={[styles.securityMessage, { color: theme.colors.textSecondary }]}>
            We never send your recovery phrase anywhere. It only lives in your device.
          </Text>
        </View>

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

        <TouchableOpacity
          style={styles.helpLinkContainer}
          onPress={() => openLink('https://www.bitsleuth.ai/glossary/passphrase')}
        >
          <Text style={[styles.helpLinkText, { color: theme.colors.primary }]}>
            What is a recovery phrase?
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
        await importWallet(walletName.trim(), generatedMnemonic, selectedColor);
        router.replace('/(tabs)');
      } catch (error) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create wallet');
      } finally {
        setIsLoading(false);
        setShowConfetti(false);
      }
    }, 2000);
  };

  const renderConfirmMode = () => (
    <ScrollView style={styles.content}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setMode('create')}
        activeOpacity={0.7}
      >
        <ArrowLeft color={theme.colors.text} size={24} />
      </TouchableOpacity>

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
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitButton, { 
            backgroundColor: theme.colors.primary,
            opacity: isLoading ? 0.6 : 1
          }]}
          onPress={handleConfirmRecoveryPhrase}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Creating Wallet...' : 'Create Wallet'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helpLinkContainer}
          onPress={() => openLink('https://www.bitsleuth.ai/glossary/passphrase')}
        >
          <Text style={[styles.helpLinkText, { color: theme.colors.primary }]}>
            What is a recovery phrase?
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
  backToDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backToDashboardText: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    width: 20,
    height: 20,
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
});