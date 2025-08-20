import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';
import QRCode from 'react-native-qrcode-svg';



export default function ViewRecoveryPhrase() {
  const { currentWallet, theme } = useWallet();
  const [isRevealed, setIsRevealed] = useState(false);

  const handleReveal = () => {
    Alert.alert(
      'Security Warning',
      'Make sure no one is watching your screen. Your recovery phrase gives full access to your wallet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Understand',
          onPress: () => setIsRevealed(true),
          style: 'destructive',
        },
      ]
    );
  };

  const handleBack = () => {
    router.back();
  };

  if (!currentWallet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen
          options={{
            title: 'Recovery Phrase',
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            headerTitleStyle: { color: theme.colors.text },
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            No wallet found. Please create or import a wallet first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const mnemonicWords = currentWallet.mnemonic.split(' ');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Recovery Phrase',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { color: theme.colors.text },
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Code Section */}
        <View style={styles.qrContainer}>
          <View style={[styles.qrWrapper, { borderColor: '#8B5CF6' }]}>
            {isRevealed ? (
              <QRCode
                value={currentWallet.mnemonic}
                size={160}
                backgroundColor="white"
                color="black"
              />
            ) : (
              <View style={styles.blurredQR}>
                <View style={styles.blurOverlay} />
              </View>
            )}
          </View>
        </View>

        {/* Mnemonic Words Grid */}
        <View style={styles.mnemonicContainer}>
          {mnemonicWords.map((word, index) => (
            <View key={index} style={styles.wordContainer}>
              <Text style={[styles.wordNumber, { color: theme.colors.textSecondary }]}>
                {index + 1}.
              </Text>
              <Text style={[styles.word, { color: theme.colors.text }]}>
                {isRevealed ? word : '\u2022'.repeat(word.length)}
              </Text>
            </View>
          ))}
        </View>

        {/* Reveal Button */}
        {!isRevealed && (
          <TouchableOpacity
            style={[styles.revealButton, { backgroundColor: theme.colors.surface }]}
            onPress={handleReveal}
          >
            <Eye size={20} color={theme.colors.text} />
            <Text style={[styles.revealText, { color: theme.colors.text }]}>Reveal</Text>
          </TouchableOpacity>
        )}

        {/* Warning Section */}
        <View style={styles.warningContainer}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={styles.warningTitle}>Extreme Caution: Do Not Share!</Text>
          </View>
          <Text style={styles.warningText}>
            Anyone with this phrase can steal your Bitcoin. Never share it with anyone. Store it in a secure, offline location separate from this device.
          </Text>
        </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
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
  qrContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  qrWrapper: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 3,
    backgroundColor: 'white',
  },
  blurredQR: {
    width: 160,
    height: 160,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    position: 'relative',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  mnemonicContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '30%',
    marginBottom: 16,
  },
  wordNumber: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
    minWidth: 20,
  },
  word: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
    gap: 8,
  },
  revealText: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#DC2626',
  },
});