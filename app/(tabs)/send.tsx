import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { QrCode, ArrowUpRight } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';

export default function SendScreen() {
  const { currentWallet, balance, theme } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isAmountInBTC, setIsAmountInBTC] = useState(true);
  const [feeRate] = useState('3');
  const [enableRBF, setEnableRBF] = useState(true);

  const handleSendMax = () => {
    try {
      if (balance > 0) {
        // Reserve some amount for fees (rough estimate)
        const feeEstimate = 0.0001; // ~0.0001 BTC for fees
        const maxSendable = Math.max(0, balance - feeEstimate);
        setAmount(maxSendable.toFixed(8));
      } else {
        Alert.alert('Error', 'No balance available to send');
      }
    } catch (error) {
      console.error('Error calculating max send amount:', error);
      Alert.alert('Error', 'Failed to calculate maximum sendable amount');
    }
  };

  const handleReviewTransaction = () => {
    try {
      // Validate inputs
      if (!recipientAddress || !amount) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      // Validate recipient address format (basic check)
      if (!recipientAddress.startsWith('bc1') && !recipientAddress.startsWith('1') && !recipientAddress.startsWith('3')) {
        Alert.alert('Error', 'Invalid Bitcoin address format');
        return;
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      if (amountNum > balance) {
        Alert.alert('Error', 'Insufficient balance');
        return;
      }

      // Show transaction review
      Alert.alert(
        'Review Transaction',
        `Send ${amount} ${isAmountInBTC ? 'BTC' : 'USD'} to:\n${recipientAddress.slice(0, 20)}...\n\nFee: ${feeRate} sat/vB\nRBF: ${enableRBF ? 'Enabled' : 'Disabled'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Confirm', 
            onPress: () => {
              console.log('✅ Transaction confirmed:', {
                to: recipientAddress,
                amount: amountNum,
                currency: isAmountInBTC ? 'BTC' : 'USD',
                feeRate,
                rbf: enableRBF
              });
              
              // For demo purposes, show success message
              Alert.alert(
                'Transaction Sent',
                'Your Bitcoin transaction has been broadcast to the network. It may take a few minutes to confirm.',
                [{ text: 'OK', onPress: () => {
                  // Clear form
                  setRecipientAddress('');
                  setAmount('');
                }}]
              );
            }
          },
        ]
      );
    } catch (error) {
      console.error('Error reviewing transaction:', error);
      Alert.alert('Error', 'Failed to review transaction. Please try again.');
    }
  };

  if (!currentWallet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'Send' }} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Wallet Found
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Create or import a wallet to send funds
          </Text>
          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/wallet-setup')}
          >
            <Text style={styles.setupButtonText}>Setup Wallet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Send' }} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
        {/* From Section */}
        <View style={styles.fromSection}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>From:</Text>
          <View style={styles.fromContainer}>
            <View style={styles.walletIcon}>
              <Text style={styles.walletIconText}>J</Text>
            </View>
            <Text style={[styles.walletName, { color: theme.colors.text }]}>
              {currentWallet.name}
            </Text>
          </View>
        </View>

        {/* Recipient Address */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
            Recipient Address
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }
              ]}
              placeholder="bc1q..."
              placeholderTextColor={theme.colors.textSecondary}
              value={recipientAddress}
              onChangeText={setRecipientAddress}
              multiline
            />
            <TouchableOpacity 
              style={styles.qrButton}
              onPress={() => {
                Alert.alert(
                  'QR Scanner',
                  'QR code scanning is not available in this demo. Please enter the address manually.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <QrCode color={theme.colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.inputSection}>
          <View style={styles.amountHeader}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Amount ({isAmountInBTC ? 'BTC' : 'USD'})
            </Text>
            <View style={styles.currencyToggle}>
              <Text style={[styles.toggleLabel, { color: theme.colors.textSecondary }]}>
                BTC
              </Text>
              <Switch
                value={!isAmountInBTC}
                onValueChange={(value) => setIsAmountInBTC(!value)}
                trackColor={{ false: theme.colors.primary, true: theme.colors.textSecondary }}
                thumbColor="white"
              />
              <Text style={[styles.toggleLabel, { color: theme.colors.textSecondary }]}>
                USD
              </Text>
            </View>
          </View>
          
          <TextInput
            style={[
              styles.amountInput,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }
            ]}
            placeholder="0.00000000"
            placeholderTextColor={theme.colors.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          
          <TouchableOpacity onPress={handleSendMax}>
            <Text style={[styles.sendMaxText, { color: theme.colors.primary }]}>
              Send Max
            </Text>
          </TouchableOpacity>
        </View>

        {/* Fee Section */}
        <View style={styles.feeSection}>
          <View style={styles.feeHeader}>
            <View style={styles.feeInfo}>
              <ArrowUpRight color={theme.colors.primary} size={20} />
              <Text style={[styles.feeLabel, { color: theme.colors.text }]}>
                Normal Fee
              </Text>
            </View>
            <View style={styles.feeDetails}>
              <Text style={[styles.feeTime, { color: theme.colors.textSecondary }]}>
                30-60 min
              </Text>
              <Text style={[styles.feeAmount, { color: theme.colors.textSecondary }]}>
                {feeRate} sat/vB
              </Text>
            </View>
          </View>

          <View style={styles.feeSlider}>
            <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>
              Slower
            </Text>
            <View style={styles.slider}>
              <View style={[styles.sliderTrack, { backgroundColor: theme.colors.primary }]} />
              <View style={[styles.sliderThumb, { backgroundColor: theme.colors.primary }]} />
            </View>
            <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>
              Faster
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.customFeeButton}
            onPress={() => {
              Alert.alert(
                'Custom Fee',
                'Custom fee selection is not available in this demo. The current fee rate will be used.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={[styles.customFeeText, { color: theme.colors.textSecondary }]}>
              Custom Fee
            </Text>
          </TouchableOpacity>
        </View>

        {/* RBF Toggle */}
        <View style={styles.rbfSection}>
          <View style={styles.rbfInfo}>
            <Text style={[styles.rbfLabel, { color: theme.colors.text }]}>
              Enable RBF
            </Text>
            <Text style={[styles.rbfDescription, { color: theme.colors.textSecondary }]}>
              Replace-by-fee allows you to increase the fee later
            </Text>
          </View>
          <Switch
            value={enableRBF}
            onValueChange={setEnableRBF}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="white"
          />
        </View>

        {/* Coin Control */}
        <TouchableOpacity 
          style={styles.coinControlSection}
          onPress={() => {
            Alert.alert(
              'Coin Control',
              'Coin control is not available in this demo. All available coins will be used automatically.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={[styles.coinControlLabel, { color: theme.colors.text }]}>
            Coin Control
          </Text>
          <Text style={[styles.coinControlAction, { color: theme.colors.primary }]}>
            Select Coins
          </Text>
        </TouchableOpacity>
        </View>

        {/* Review Button */}
        <TouchableOpacity
          style={[
            styles.reviewButton, 
            { 
              backgroundColor: theme.colors.primary,
              opacity: (!recipientAddress || !amount) ? 0.5 : 1
            }
          ]}
          onPress={handleReviewTransaction}
          disabled={!recipientAddress || !amount}
        >
          <Text style={styles.reviewButtonText}>Review Transaction</Text>
        </TouchableOpacity>
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
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fromSection: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  fromContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletIconText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  walletName: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 56,
  },
  qrButton: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    marginHorizontal: 8,
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  sendMaxText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  feeSection: {
    marginBottom: 20,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  feeDetails: {
    alignItems: 'flex-end',
  },
  feeTime: {
    fontSize: 14,
  },
  feeAmount: {
    fontSize: 14,
    marginTop: 2,
  },
  feeSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 12,
  },
  slider: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginHorizontal: 16,
    position: 'relative',
  },
  sliderTrack: {
    width: '60%',
    height: '100%',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    right: '40%',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  customFeeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customFeeText: {
    fontSize: 14,
  },
  rbfSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rbfInfo: {
    flex: 1,
    marginRight: 16,
  },
  rbfLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rbfDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  coinControlSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  coinControlLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  coinControlAction: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviewButton: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  setupButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});