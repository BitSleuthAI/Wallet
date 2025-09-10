import { GradientBackground } from '@/components/GradientBackground';
import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import { Transaction } from '@/types/wallet';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    ArrowDownLeft,
    ArrowUpRight,
    Copy,
    CheckCircle,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TransactionExplorerData {
  txid: string;
  timestamp: number;
  netAmount: number;
  fee: number;
  feeUSD: number;
  confirmations: number;
  blockHeight: number;
  status: 'confirmed' | 'pending' | 'failed';
  inputValue: number;
  outputValue: number;
  feePerVB: number;
  size: number;
  weight: number;
  version: number;
  locktime: number;
  rbf: boolean;
  inputs: Array<{
    address: string;
    value: number;
  }>;
  outputs: Array<{
    address: string;
    value: number;
  }>;
}

export default function TransactionExplorerScreen() {
  const { txid } = useLocalSearchParams<{ txid: string }>();
  const { theme, transactions, bitcoinPrice } = useWallet();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [explorerData, setExplorerData] = useState<TransactionExplorerData | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (txid && transactions) {
      const tx = transactions.find(t => t.txid === txid);
      setTransaction(tx || null);
      
      // Simulate fetching enhanced data
      // In production, this would fetch from BitSleuth API
      if (tx) {
        const mockExplorerData: TransactionExplorerData = {
          txid: tx.txid,
          timestamp: tx.timestamp,
          netAmount: tx.amount,
          fee: tx.fee || 147,
          feeUSD: bitcoinPrice?.usd ? (tx.fee || 147) * 0.00000001 * bitcoinPrice.usd : 0.12,
          confirmations: tx.confirmations || 6790,
          blockHeight: tx.blockHeight || 907167,
          status: tx.status,
          inputValue: tx.amount + (tx.fee || 147) * 0.00000001,
          outputValue: tx.amount,
          feePerVB: tx.feeRate || 0.66,
          size: 223,
          weight: 562,
          version: 2,
          locktime: 0,
          rbf: tx.rbf || false,
          inputs: [
            {
              address: 'bc1qa0098g1tyy4dc42dq0c09vmjpaahy2ea1uaxnw',
              value: tx.amount + (tx.fee || 147) * 0.00000001,
            }
          ],
          outputs: [
            {
              address: 'bc1qr353yp9xlhpw02z94hrjw3ufazeq0yz5nt6j4d',
              value: 0.00008610,
            },
            {
              address: 'bc1qa0098g1tyy4dc42dq0c09vmjpaahy2ea1uaxnw',
              value: tx.amount - 0.00008610,
            }
          ],
        };
        setExplorerData(mockExplorerData);
      }
      setLoading(false);
    }
  }, [txid, transactions, bitcoinPrice]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/\//g, '/');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Copied to clipboard');
    } catch {
      Alert.alert('Error', 'Failed to copy');
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 20) return address;
    return `${address.slice(0, 10)}...${address.slice(-10)}`;
  };

  if (loading) {
    return (
      <GradientBackground theme={theme} style={styles.container}>
        <Stack.Screen 
          options={{ 
            headerShown: false,
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  if (!transaction || !explorerData) {
    return (
      <GradientBackground theme={theme} style={styles.container}>
        <Stack.Screen 
          options={{ 
            headerShown: false,
          }} 
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Transaction not found
          </Text>
        </View>
      </GradientBackground>
    );
  }

  const isReceive = transaction?.amount > 0;
  const ArrowIcon = isReceive ? ArrowDownLeft : ArrowUpRight;
  const arrowColor = isReceive ? '#22c55e' : '#ef4444';

  return (
    <GradientBackground theme={theme} style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTransparent: true,
          headerTitle: 'Transaction',
          headerTitleStyle: {
            fontWeight: 'bold',
            color: theme.colors.text,
          },
          headerLeft: () => (
            <TouchableOpacity 
              style={styles.headerBackButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color={theme.colors.text} size={24} />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: 'transparent',
          },
        }} 
      />
      
      <ScrollView 
        style={[styles.scrollView, { paddingTop: insets.top + 56 }]} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        {/* Transaction Details Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.transactionHeader}>
            <View style={[styles.transactionIconContainer, { backgroundColor: isReceive ? '#22c55e' : '#ef4444' }]}>
              <ArrowIcon color="white" size={16} />
            </View>
            <Text style={[styles.subtitle, { color: theme.colors.text, fontWeight: 'bold' }]}>
              Broadcasted on {formatDate(explorerData.timestamp)}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.txidContainer}
            onPress={() => copyToClipboard(explorerData.txid)}
          >
            <Text style={[styles.txid, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {explorerData.txid}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Summary
          </Text>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Net Amount
            </Text>
            <View style={styles.valueContainer}>
              <Text style={[styles.btcValue, { color: theme.colors.text }]}>
                {explorerData.netAmount.toFixed(8)} BTC
              </Text>
              <Text style={[styles.usdValue, { color: theme.colors.textSecondary }]}>
                £{(explorerData.netAmount * (bitcoinPrice?.usd || 0)).toFixed(2)}
              </Text>
            </View>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Fee
            </Text>
            <View style={styles.valueContainer}>
              <Text style={[styles.btcValue, { color: theme.colors.text }]}>
                {explorerData.fee} SATS
              </Text>
              <Text style={[styles.usdValue, { color: theme.colors.textSecondary }]}>
                £{explorerData.feeUSD.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Status
          </Text>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: theme.colors.success + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: theme.colors.success }]}>
                Confirmed
              </Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <CheckCircle color={theme.colors.success} size={24} />
            <View style={styles.statusTextContainer}>
              <Text style={[styles.statusMainText, { color: theme.colors.text }]}>
                This transaction has {explorerData.confirmations.toLocaleString()} confirmations.
              </Text>
              <Text style={[styles.statusSubText, { color: theme.colors.textSecondary }]}>
                It was mined in Block {explorerData.blockHeight.toLocaleString()}.
              </Text>
            </View>
          </View>
        </View>

        {/* Advanced Details Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Advanced Details
          </Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Input Value
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {explorerData.inputValue.toFixed(8)} BTC
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Output Value
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {explorerData.outputValue.toFixed(8)} BTC
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Fee/vB
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {explorerData.feePerVB.toFixed(2)} sat/vB
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Size
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {explorerData.size} Bytes
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Weight
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {explorerData.weight} WU
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Version
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {explorerData.version}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Locktime
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {explorerData.locktime}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              RBF
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {explorerData.rbf ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>

        {/* Inputs Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            From (Inputs) ({explorerData.inputs.length})
          </Text>
          
          {explorerData.inputs.map((input, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.addressRow}
              onPress={() => copyToClipboard(input.address)}
            >
              <Text style={[styles.addressText, { color: theme.colors.text }]} numberOfLines={1}>
                {input.address}
              </Text>
              <Text style={[styles.addressValue, { color: theme.colors.text }]}>
                {input.value.toFixed(8)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Outputs Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, marginBottom: 40 }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            To (Outputs) ({explorerData.outputs.length})
          </Text>
          
          {explorerData.outputs.map((output, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.addressRow}
              onPress={() => copyToClipboard(output.address)}
            >
              <Text style={[styles.addressText, { color: theme.colors.text }]} numberOfLines={1}>
                {output.address}
              </Text>
              <Text style={[styles.addressValue, { color: theme.colors.text }]}>
                {output.value.toFixed(8)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
  },
  errorText: {
    ...platformStyles.typography.bodyLarge,
    textAlign: 'center',
  },
  card: {
    margin: platformStyles.spacing.md,
    marginBottom: platformStyles.spacing.sm,
    padding: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.large,
    ...platformStyles.shadow,
  },
  headerBackButton: {
    padding: platformStyles.spacing.sm,
    marginLeft: platformStyles.spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 60,
  },
  headerTitle: {
    ...platformStyles.typography.heading,
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.md,
  },
  transactionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.sm,
  },
  txidContainer: {
    flex: 1,
  },
  copyButton: {
    padding: platformStyles.spacing.sm,
    marginLeft: platformStyles.spacing.sm,
  },
  subtitle: {
    ...platformStyles.typography.body,
    fontSize: 14,
  },
  txid: {
    ...platformStyles.typography.caption,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  cardTitle: {
    ...platformStyles.typography.title,
    fontSize: 22,
    fontWeight: 'bold' as const,
    marginBottom: platformStyles.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: platformStyles.spacing.lg,
  },
  label: {
    ...platformStyles.typography.bodyLarge,
    fontSize: 16,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  btcValue: {
    ...platformStyles.typography.bodyLarge,
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  usdValue: {
    ...platformStyles.typography.body,
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: platformStyles.spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: platformStyles.spacing.md,
    paddingVertical: platformStyles.spacing.sm,
    borderRadius: platformStyles.borderRadius.medium,
  },
  statusBadgeText: {
    ...platformStyles.typography.bodyLarge,
    fontWeight: '600' as const,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusTextContainer: {
    flex: 1,
    marginLeft: platformStyles.spacing.md,
  },
  statusMainText: {
    ...platformStyles.typography.bodyLarge,
    fontSize: 16,
    marginBottom: 4,
  },
  statusSubText: {
    ...platformStyles.typography.body,
    fontSize: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.sm,
  },
  detailLabel: {
    ...platformStyles.typography.body,
    fontSize: 15,
  },
  detailValue: {
    ...platformStyles.typography.body,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.1)',
  },
  addressText: {
    ...platformStyles.typography.caption,
    fontSize: 13,
    fontFamily: 'monospace',
    flex: 1,
    marginRight: platformStyles.spacing.md,
  },
  addressValue: {
    ...platformStyles.typography.bodyLarge,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});