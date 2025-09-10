import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Copy, ExternalLink } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useWalletStore } from '@/hooks/wallet-store';
import { hapticFeedback } from '@/services/haptic-service';
import { useTheme } from '@react-navigation/native';

interface TransactionDetails {
  txid: string;
  type: 'send' | 'receive';
  amount: number;
  fee?: number;
  confirmations: number;
  timestamp: number;
  inputs: Array<{
    address: string;
    amount: number;
  }>;
  outputs: Array<{
    address: string;
    amount: number;
  }>;
  size: number;
  weight: number;
  blockHeight?: number;
  blockHash?: string;
}

export default function TransactionExplorer() {
  const { txid } = useLocalSearchParams<{ txid: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentWallet } = useWalletStore();
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    loadTransactionDetails();
  }, [txid]);

  const loadTransactionDetails = async () => {
    try {
      setLoading(true);
      // Simulate loading transaction details
      // In a real app, this would fetch from the Bitcoin network or your backend
      
      // Mock data - in production, determine type based on wallet addresses
      const mockTransaction: TransactionDetails = {
        txid: txid as string,
        type: Math.random() > 0.5 ? 'send' : 'receive', // This should be determined by checking if inputs contain wallet addresses
        amount: 0.00125,
        fee: 0.00002,
        confirmations: 6,
        timestamp: Date.now() - 3600000,
        inputs: [
          { address: 'bc1q...abc', amount: 0.00127 }
        ],
        outputs: [
          { address: 'bc1q...xyz', amount: 0.00125 }
        ],
        size: 225,
        weight: 900,
        blockHeight: 812345,
        blockHash: '00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72728a054',
      };

      // Determine transaction type based on wallet addresses
      // This is the key logic that needs to match the dashboard/history
      if (currentWallet) {
        const walletAddresses = await getWalletAddresses(); // You'd implement this
        const isReceive = mockTransaction.outputs.some(output => 
          walletAddresses.includes(output.address)
        );
        mockTransaction.type = isReceive ? 'receive' : 'send';
      }

      setTransaction(mockTransaction);
    } catch (error) {
      console.error('Error loading transaction:', error);
      Alert.alert('Error', 'Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  };

  const getWalletAddresses = async (): Promise<string[]> => {
    // This should return all addresses associated with the current wallet
    // For now, returning mock data
    return ['bc1q...xyz'];
  };

  const copyToClipboard = async (text: string, field: string) => {
    await hapticFeedback('light');
    Clipboard.setString(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ', ' + date.toLocaleTimeString('en-GB');
  };

  const formatBTC = (amount: number) => {
    return amount.toFixed(8) + ' BTC';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTransparent: true,
            headerTitle: '',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
            ),
          }}
        />
        <LinearGradient
          colors={['#FF6B35', '#F7931A']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Transaction</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTransparent: true,
            headerTitle: '',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
            ),
          }}
        />
        <LinearGradient
          colors={['#FF6B35', '#F7931A']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Transaction</Text>
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Transaction not found
          </Text>
        </View>
      </View>
    );
  }

  const TransactionIcon = transaction.type === 'receive' ? ArrowDownLeft : ArrowUpRight;
  const iconColor = transaction.type === 'receive' ? '#10B981' : '#EF4444';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <LinearGradient
        colors={['#FF6B35', '#F7931A']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Transaction</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Transaction Header */}
        <View style={styles.transactionHeader}>
          <View style={styles.transactionTypeRow}>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
              <TransactionIcon size={24} color={iconColor} />
            </View>
            <Text style={[styles.broadcastText, { color: colors.text }]}>
              Broadcasted on {formatDate(transaction.timestamp)}
            </Text>
          </View>
        </View>

        {/* Transaction ID */}
        <TouchableOpacity
          style={[styles.section, { backgroundColor: colors.card }]}
          onPress={() => copyToClipboard(transaction.txid, 'txid')}
          activeOpacity={0.7}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction ID</Text>
          <Text style={[styles.txidText, { color: colors.text }]} numberOfLines={1}>
            {transaction.txid}
          </Text>
          {copiedField === 'txid' && (
            <Text style={styles.copiedText}>Copied!</Text>
          )}
        </TouchableOpacity>

        {/* Amount & Fee */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <Text style={[styles.label, { color: colors.text + '80' }]}>Amount</Text>
              <Text style={[styles.amountText, { color: iconColor }]}>
                {transaction.type === 'receive' ? '+' : '-'}{formatBTC(transaction.amount)}
              </Text>
            </View>
            {transaction.fee && (
              <View style={styles.amountItem}>
                <Text style={[styles.label, { color: colors.text + '80' }]}>Fee</Text>
                <Text style={[styles.feeText, { color: colors.text }]}>
                  {formatBTC(transaction.fee)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Confirmations */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Confirmations</Text>
          <View style={styles.confirmationsRow}>
            <Text style={[styles.confirmationsText, { color: colors.text }]}>
              {transaction.confirmations}
            </Text>
            <View style={[
              styles.confirmationsBadge,
              { backgroundColor: transaction.confirmations >= 6 ? '#10B98120' : '#F5973120' }
            ]}>
              <Text style={[
                styles.confirmationsBadgeText,
                { color: transaction.confirmations >= 6 ? '#10B981' : '#F59731' }
              ]}>
                {transaction.confirmations >= 6 ? 'Confirmed' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Technical Details */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Technical Details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Size</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{transaction.size} bytes</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Weight</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{transaction.weight} WU</Text>
            </View>
            {transaction.blockHeight && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Block Height</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{transaction.blockHeight}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Inputs & Outputs */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Inputs ({transaction.inputs.length})</Text>
          {transaction.inputs.map((input, index) => (
            <TouchableOpacity
              key={index}
              style={styles.addressItem}
              onPress={() => copyToClipboard(input.address, `input-${index}`)}
            >
              <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
                {input.address}
              </Text>
              <Text style={[styles.addressAmount, { color: colors.text + '80' }]}>
                {formatBTC(input.amount)}
              </Text>
              {copiedField === `input-${index}` && (
                <Text style={styles.copiedText}>Copied!</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Outputs ({transaction.outputs.length})</Text>
          {transaction.outputs.map((output, index) => (
            <TouchableOpacity
              key={index}
              style={styles.addressItem}
              onPress={() => copyToClipboard(output.address, `output-${index}`)}
            >
              <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
                {output.address}
              </Text>
              <Text style={[styles.addressAmount, { color: colors.text + '80' }]}>
                {formatBTC(output.amount)}
              </Text>
              {copiedField === `output-${index}` && (
                <Text style={styles.copiedText}>Copied!</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Block Hash */}
        {transaction.blockHash && (
          <TouchableOpacity
            style={[styles.section, { backgroundColor: colors.card }]}
            onPress={() => copyToClipboard(transaction.blockHash, 'blockHash')}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Block Hash</Text>
            <Text style={[styles.hashText, { color: colors.text }]} numberOfLines={2}>
              {transaction.blockHash}
            </Text>
            {copiedField === 'blockHash' && (
              <Text style={styles.copiedText}>Copied!</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  transactionHeader: {
    marginBottom: 20,
  },
  transactionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  broadcastText: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txidText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copiedText: {
    position: 'absolute',
    right: 16,
    top: 16,
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountItem: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  feeText: {
    fontSize: 16,
  },
  confirmationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmationsText: {
    fontSize: 18,
    fontWeight: '600',
  },
  confirmationsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  confirmationsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  addressItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000010',
  },
  addressText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  addressAmount: {
    fontSize: 12,
  },
  hashText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
});