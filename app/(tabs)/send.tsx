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
import { platformStyles, createButtonStyle, createInputStyle } from '@/constants/themes';
import WalletSelector from '@/components/WalletSelector';
import { sendTransaction } from '@/services/bitcoin-service';
import { feeEstimationService } from '@/services/fee-service';

export default function SendScreen() {
  const { currentWallet, balance, theme } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isAmountInBTC, setIsAmountInBTC] = useState(true);
  const [feeRate, setFeeRate] = useState(3);
  const [enableRBF, setEnableRBF] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);

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

  const handleSendTransaction = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
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

      console.log('🚀 Starting transaction send process...');
      
      // Send the transaction
      const result = await sendTransaction(
        currentWallet,
        recipientAddress,
        amountNum,
        feeRate,
        enableRBF
      );
      
      console.log('✅ Transaction sent successfully:', result);
      
      // Show success message
      Alert.alert(
        'Transaction Sent!',
        `Your Bitcoin transaction has been broadcast to the network.\n\nTransaction ID: ${result.txid.substring(0, 16)}...\nFee: ${result.fee.toFixed(8)} BTC\n\nIt may take a few minutes to confirm.`,
        [{ 
          text: 'OK', 
          onPress: () => {
            // Clear form
            setRecipientAddress('');
            setAmount('');
            setEstimatedFee(null);
            
            // Navigate to home to see updated balance
            router.push('/');
          }
        }]
      );
      
    } catch (error) {
      console.error('❌ Error sending transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      Alert.alert(
        'Transaction Failed',
        `Failed to send transaction: ${errorMessage}\n\nPlease check your inputs and try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
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

      // Calculate estimated fee
      const estimatedTxSize = 250; // bytes (rough estimate for 1 input, 2 outputs)
      const estimatedFeeBTC = (estimatedTxSize * feeRate) / 100000000;
      
      // Show transaction review
      Alert.alert(
        'Review Transaction',
        `Send ${amount} ${isAmountInBTC ? 'BTC' : 'USD'} to:\n${recipientAddress.slice(0, 20)}...\n\nEstimated Fee: ${estimatedFeeBTC.toFixed(8)} BTC (${feeRate} sat/vB)\nRBF: ${enableRBF ? 'Enabled' : 'Disabled'}\n\nThis will create and broadcast a real Bitcoin transaction.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Send Transaction', 
            style: 'destructive',
            onPress: handleSendTransaction
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
        <WalletSelector label="From:" />

        {/* Recipient Address */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
            Recipient Address
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                createInputStyle(theme),
                styles.textInput,
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
              createInputStyle(theme),
              styles.amountInput,
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
                Transaction Fee
              </Text>
            </View>
            <View style={styles.feeDetails}>
              <Text style={[styles.feeTime, { color: theme.colors.textSecondary }]}>
                {feeRate <= 5 ? '2-3 hours' : feeRate <= 10 ? '30-60 min' : '10-30 min'}
              </Text>
              <Text style={[styles.feeAmount, { color: theme.colors.textSecondary }]}>
                {feeRate} sat/vB
              </Text>
            </View>
          </View>

          <View style={styles.feeButtons}>
            <TouchableOpacity 
              style={[
                styles.feeButton,
                { 
                  backgroundColor: feeRate === 1 ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border
                }
              ]}
              onPress={() => setFeeRate(1)}
            >
              <Text style={[
                styles.feeButtonText, 
                { color: feeRate === 1 ? 'white' : theme.colors.text }
              ]}>
                Slow\n1 sat/vB
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.feeButton,
                { 
                  backgroundColor: feeRate === 5 ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border
                }
              ]}
              onPress={() => setFeeRate(5)}
            >
              <Text style={[
                styles.feeButtonText, 
                { color: feeRate === 5 ? 'white' : theme.colors.text }
              ]}>
                Normal\n5 sat/vB
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.feeButton,
                { 
                  backgroundColor: feeRate === 15 ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border
                }
              ]}
              onPress={() => setFeeRate(15)}
            >
              <Text style={[
                styles.feeButtonText, 
                { color: feeRate === 15 ? 'white' : theme.colors.text }
              ]}>
                Fast\n15 sat/vB
              </Text>
            </TouchableOpacity>
          </View>
          
          {estimatedFee && (
            <View style={styles.feeEstimate}>
              <Text style={[styles.feeEstimateText, { color: theme.colors.textSecondary }]}>
                Estimated fee: {estimatedFee.toFixed(8)} BTC
              </Text>
            </View>
          )}
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
            createButtonStyle(theme, 'primary'),
            styles.reviewButton,
            { 
              opacity: (!recipientAddress || !amount || isLoading) ? 0.5 : 1
            }
          ]}
          onPress={handleReviewTransaction}
          disabled={!recipientAddress || !amount || isLoading}
        >
          <Text style={styles.reviewButtonText}>
            {isLoading ? 'Sending...' : 'Review Transaction'}
          </Text>
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
  feeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  feeButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  feeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  feeEstimate: {
    alignItems: 'center',
    paddingTop: 8,
  },
  feeEstimateText: {
    fontSize: 14,
    fontStyle: 'italic',
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