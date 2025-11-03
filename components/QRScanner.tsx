import { useWallet } from '@/hooks/wallet-store';
import { googlePlayServicesService } from '@/services/google-play-services';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

// Wrapper component that checks for context availability
export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const walletContext = useWallet();
  
  // Safety check: if context is not available yet, return null
  if (!walletContext) {
    return null;
  }
  
  return <QRScannerContent onScan={onScan} onClose={onClose} />;
}

// Main component with all hooks
function QRScannerContent({ onScan, onClose }: QRScannerProps) {
  const { theme } = useWallet()!; // Non-null assertion is safe here because wrapper checked
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [playServicesAvailable, setPlayServicesAvailable] = useState<boolean | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualAddress, setManualAddress] = useState('');

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const checkPlayServices = async () => {
      try {
        const isAvailable = await googlePlayServicesService.checkAvailability();
        setPlayServicesAvailable(isAvailable);
        
        if (!isAvailable && Platform.OS === 'android') {
          const detailedStatus = await googlePlayServicesService.getDetailedStatus();
          if (detailedStatus?.isUserResolvable) {
            // Show dialog to update Play Services
            await googlePlayServicesService.showErrorDialog();
          }
        }
      } catch (error) {
        console.error('Error checking Google Play Services:', error);
        setPlayServicesAvailable(false);
      }
    };

    checkPlayServices();
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            QR Scanner
          </Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            On web, you can manually enter the Bitcoin address below or use your device&apos;s camera to scan QR codes.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              // Try to access camera on web
              if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                  .then(() => {
                              const successMessage = 'Camera access granted. You can now scan QR codes using your device camera.';
          Alert.alert(
            'Camera Access',
            successMessage,
            [{ text: 'OK', onPress: onClose }]
          );
                  })
                  .catch(() => {
                    const errorMessage = 'Camera access is not available on this device. Please manually enter the Bitcoin address.';
                    Alert.alert(
                      'Camera Not Available',
                      errorMessage,
                      [{ text: 'OK', onPress: onClose }]
                    );
                  });
              } else {
                const notSupportedMessage = 'Camera is not supported on this browser. Please manually enter the Bitcoin address.';
                Alert.alert(
                  'Camera Not Supported',
                  notSupportedMessage,
                  [{ text: 'OK', onPress: onClose }]
                );
              }
            }}
          >
            <Text style={styles.buttonText}>Try Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>Manual Entry</Text>
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

  // Show loading while checking Play Services
  if (playServicesAvailable === null) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Show Play Services error on Android
  if (Platform.OS === 'android' && playServicesAvailable === false) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            QR Scanner Unavailable
          </Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            Google Play Services is required for QR code scanning but is not available on this device. You can manually enter the Bitcoin address instead.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={() => setManualEntry(true)}
          >
            <Text style={styles.buttonText}>Manual Entry</Text>
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

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            We need camera permission to scan QR codes containing Bitcoin addresses.
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

  // Manual entry mode
  if (manualEntry) {
    const handleManualSubmit = () => {
      if (manualAddress.trim()) {
        const input = manualAddress.trim();
        
        // Check if it's a Bitcoin address
        const isValidAddress = (
          input.startsWith('bc1') || 
          input.startsWith('1') || 
          input.startsWith('3') ||
          input.startsWith('tb1') // testnet
        ) && input.length >= 26 && input.length <= 62;
        
        // Check if it's a recovery phrase (12 or 24 words)
        const words = input.split(/\s+/);
        const isRecoveryPhrase = words.length === 12 || words.length === 24;
        
        if (isValidAddress || isRecoveryPhrase) {
          onScan(input);
          onClose();
        } else {
          Alert.alert(
            'Invalid Input',
            'Please enter a valid Bitcoin address or recovery phrase (12 or 24 words).',
            [{ text: 'OK' }]
          );
        }
      }
    };

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.manualEntryHeader}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Manual Entry
            </Text>
            <TouchableOpacity 
              style={[styles.manualCloseButton, { backgroundColor: theme.colors.background }]} 
              onPress={() => setManualEntry(false)}
            >
              <X color={theme.colors.text} size={20} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            Enter a Bitcoin address or recovery phrase (12 or 24 words).
          </Text>
          
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border 
            }]}
            value={manualAddress}
            onChangeText={setManualAddress}
            placeholder="Enter Bitcoin address..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            underlineColorAndroid="transparent"
          />
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleManualSubmit}
          >
            <Text style={styles.buttonText}>Use Address</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={() => setManualEntry(false)}
          >
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>Back to Scanner</Text>
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
        const invalidMessage = 'The scanned QR code does not contain a valid Bitcoin address or recovery phrase.';
        Alert.alert(
          'Invalid QR Code',
          invalidMessage,
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
      const errorMessage = 'Failed to process the QR code. Please try again.';
      Alert.alert(
        'Error',
        errorMessage,
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
              Position the Bitcoin address QR code within the frame to scan
            </Text>
          </View>
          
          <View style={styles.bottomButtons}>
            <TouchableOpacity
              style={[styles.manualButton, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
              onPress={() => setManualEntry(true)}
            >
              <Text style={styles.manualButtonText}>Manual Entry</Text>
            </TouchableOpacity>
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
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  manualButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  manualButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  manualEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  manualCloseButton: {
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
});