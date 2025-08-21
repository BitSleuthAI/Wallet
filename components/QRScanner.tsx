import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const { theme } = useWallet();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            QR Scanner Not Available
          </Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            QR code scanning is not available on web. Please use the mobile app to scan QR codes.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            We need camera permission to scan QR codes containing recovery phrases.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    console.log('QR Code scanned:', data);
    
    try {
      // Check if it's a Bitcoin address or URI
      let address = data.trim();
      
      // Handle bitcoin: URI format
      if (address.startsWith('bitcoin:')) {
        const url = new URL(address);
        address = url.pathname;
      }
      
      // Basic Bitcoin address validation
      const isValidAddress = (
        address.startsWith('bc1') || 
        address.startsWith('1') || 
        address.startsWith('3') ||
        address.startsWith('tb1') // testnet
      ) && address.length >= 26 && address.length <= 62;
      
      // Check if it's a recovery phrase (12 or 24 words)
      const words = data.trim().split(/\s+/);
      const isRecoveryPhrase = words.length === 12 || words.length === 24;
      
      if (isValidAddress) {
        onScan(data);
        onClose();
      } else if (isRecoveryPhrase) {
        onScan(data);
        onClose();
      } else {
        Alert.alert(
          'Invalid QR Code',
          'The scanned QR code does not contain a valid Bitcoin address or recovery phrase.',
          [
            {
              text: 'Scan Again',
              onPress: () => setScanned(false),
            },
            {
              text: 'Cancel',
              onPress: onClose,
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert(
        'Error',
        'Failed to process the QR code. Please try again.',
        [
          {
            text: 'Scan Again',
            onPress: () => setScanned(false),
          },
          {
            text: 'Cancel',
            onPress: onClose,
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={'back' as CameraType}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X color="white" size={24} />
          </TouchableOpacity>
          
          <View style={styles.scanArea}>
            <View style={styles.scanFrame} />
          </View>
          
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Position the QR code within the frame to scan Bitcoin addresses or recovery phrases
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
    maxWidth: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
    zIndex: 1,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
});