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
} from 'react-native';
import { Stack } from 'expo-router';
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
    setAmount(balance.toString());
  };

  const handleReviewTransaction = () => {
    if (!recipientAddress || !amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (parseFloat(amount) > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    Alert.alert(
      'Review Transaction',
      `Send ${amount} BTC to ${recipientAddress.slice(0, 10)}...?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => console.log('Transaction confirmed') },
      ]
    );
  };

  if (!currentWallet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'Send Bitcoin' }} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            No wallet available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Send Bitcoin' }} />
      
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
            <TouchableOpacity style={styles.qrButton}>
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

          <TouchableOpacity style={styles.customFeeButton}>
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
        <TouchableOpacity style={styles.coinControlSection}>
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
        style={[styles.reviewButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleReviewTransaction}
      >
        <Text style={styles.reviewButtonText}>Review Transaction</Text>
      </TouchableOpacity>
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
    marginBottom: 24,
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
    marginBottom: 24,
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
    marginBottom: 24,
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
    margin: 20,
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
  },
  emptyText: {
    fontSize: 16,
  },
});