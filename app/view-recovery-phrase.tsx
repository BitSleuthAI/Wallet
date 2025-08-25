import PinVerificationScreen from '@/components/PinVerificationScreen';
import { useWallet } from '@/hooks/wallet-store';
import { Stack, router } from 'expo-router';
import { AlertTriangle, ArrowLeft, Eye, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ViewRecoveryPhrase() {
  const { currentWallet, theme } = useWallet();
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  // Debug logging for state changes
  useEffect(() => {
    console.log('ViewRecoveryPhrase: isRevealed changed to:', isRevealed);
  }, [isRevealed]);

  useEffect(() => {
    console.log('ViewRecoveryPhrase: isPinVerified changed to:', isPinVerified);
  }, [isPinVerified]);

  // Increment render count on each render
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    console.log('ViewRecoveryPhrase: Component rendered, count:', renderCount + 1);
  });

  const handleReveal = () => {
    // Try the Alert approach first
    try {
      Alert.alert(
        'Security Warning',
        'Make sure no one is watching your screen. Your recovery phrase gives full access to your wallet.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I Understand',
            onPress: () => {
              console.log('Setting isRevealed to true');
              setIsRevealed(true);
            },
            style: 'destructive',
          },
        ]
      );
    } catch (error) {
      console.log('Alert failed, showing custom modal:', error);
      setShowConfirmModal(true);
    }
  };

  const handleRevealDirect = () => {
    console.log('Direct reveal - setting isRevealed to true');
    setIsRevealed(true);
  };

  const handleConfirmModal = () => {
    console.log('Modal confirm - setting isRevealed to true');
    setShowConfirmModal(false);
    setIsRevealed(true);
  };

  const handleCancelModal = () => {
    setShowConfirmModal(false);
  };

  const handleBack = () => {
    router.back();
  };

  const handlePinSuccess = () => {
    setIsPinVerified(true);
  };

  if (!isPinVerified) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <PinVerificationScreen
          title="Recovery Phrase"
          subtitle="Confirm your PIN to view the recovery phrase."
          onSuccess={handlePinSuccess}
          onBack={handleBack}
        />
      </SafeAreaView>
    );
  }

  if (!currentWallet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
      </SafeAreaView>
    );
  }

  const mnemonicWords = currentWallet.mnemonic.split(' ');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
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
          Recovery Phrase
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
          <View style={[styles.qrWrapper, { borderColor: '#8B5CF6' }]}>
            {isRevealed === true ? (
              <View style={styles.qrContent}>
                <QRCode
                  value={currentWallet.mnemonic}
                  size={160}
                  backgroundColor="white"
                  color="black"
                  testID="recovery-phrase-qr"
                />
                <Text style={[styles.qrFallbackText, { color: theme.colors.textSecondary }]}>
                  QR Code: {currentWallet.mnemonic.substring(0, 20)}...
                </Text>
              </View>
            ) : (
              <View style={styles.blurredQR}>
                <View style={styles.blurOverlay} />
                <Text style={[styles.blurText, { color: theme.colors.textSecondary }]}>
                  Hidden (isRevealed: {String(isRevealed)})
                </Text>
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
                {isRevealed === true ? word : '\u2022'.repeat(word.length)}
              </Text>
            </View>
          ))}
        </View>

        {/* Reveal Button */}
        {isRevealed !== true && (
          <View style={styles.revealButtonsContainer}>
            <TouchableOpacity
              style={[styles.revealButton, { backgroundColor: theme.colors.surface }]}
              onPress={handleReveal}
              testID="reveal-button"
            >
              <Eye size={20} color={theme.colors.text} />
              <Text style={[styles.revealText, { color: theme.colors.text }]}>Reveal (with Alert)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.revealButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleRevealDirect}
              testID="reveal-direct-button"
            >
              <Eye size={20} color="white" />
              <Text style={[styles.revealText, { color: 'white' }]}>Reveal Direct</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Debug Info - Remove in production */}
        <View style={styles.debugContainer}>
          <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
            Debug: isRevealed = {isRevealed.toString()}, Renders = {renderCount}
          </Text>
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              console.log('Debug: Toggling isRevealed from', isRevealed, 'to', !isRevealed);
              setIsRevealed(!isRevealed);
            }}
          >
            <Text style={[styles.debugText, { color: theme.colors.text }]}>
              Toggle Reveal (Debug)
            </Text>
          </TouchableOpacity>
        </View>

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

      {/* Custom Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Security Warning</Text>
              <TouchableOpacity onPress={handleCancelModal} style={styles.closeButton}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalMessage}>
              Make sure no one is watching your screen. Your recovery phrase gives full access to your wallet.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#EF4444' }]}
                onPress={handleConfirmModal}
              >
                <Text style={styles.modalButtonText}>I Understand</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#6B7280' }]}
                onPress={handleCancelModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
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
  qrContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFallbackText: {
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
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
  revealButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
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
  debugContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 30,
  },
  debugText: {
    fontSize: 14,
  },
  debugButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  blurText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    fontSize: 14,
    fontWeight: '500',
  },
});