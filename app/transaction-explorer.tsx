import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import { getTransactionDetails } from '@/services/esplora-service';
import { Transaction } from '@/types/wallet';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
    ArrowDownLeft,
    ArrowLeft,
    ArrowUpRight,
    CheckCircle,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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
  inputs: {
    address: string;
    value: number;
  }[];
  outputs: {
    address: string;
    value: number;
  }[];
}

export default function TransactionExplorerScreen() {
  const { txid } = useLocalSearchParams<{ txid: string }>();
  const { theme, transactions, bitcoinPrice, currentWallet, formatCurrency } = useWallet();
  const lastDetailsRef = useRef<Record<string, Transaction>>({});
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [explorerData, setExplorerData] = useState<TransactionExplorerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchExplorerData = async () => {
      if (!txid) {
        if (isMounted) {
          setTransaction(null);
          setExplorerData(null);
          setError('Transaction ID not provided');
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      const localTx = transactions?.find(t => t.txid === txid) || lastDetailsRef.current[txid] || null;
      if (localTx) {
        lastDetailsRef.current[txid] = localTx;
      }
      if (isMounted) {
        setTransaction(localTx);
      }

      try {
        const { data: txDetails, error: txDetailsError } = await getTransactionDetails(txid);

        if (!txDetails || txDetailsError) {
          throw new Error(txDetailsError ?? 'Transaction details unavailable');
        }

        const summaryTransaction: Transaction = {
          ...(localTx || {}),
          ...txDetails,
        } as Transaction;
        lastDetailsRef.current[txid] = summaryTransaction;

        const explorerSummary = buildExplorerData(summaryTransaction, bitcoinPrice, currentWallet);

        if (isMounted) {
          setTransaction(summaryTransaction);
          setExplorerData(explorerSummary);
        }
      } catch (error: any) {
        if (isMounted) {
          const cached = lastDetailsRef.current[txid];
          if (cached) {
            setTransaction(cached);
            setExplorerData(buildExplorerData(cached, bitcoinPrice, currentWallet));
          } else {
            setExplorerData(null);
            setError(error.message || 'Failed to fetch transaction details');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchExplorerData();

    return () => {
      isMounted = false;
    };
  }, [txid, transactions, bitcoinPrice?.usd, bitcoinPrice, currentWallet]);

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



  if (loading) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <AndroidSafeContainer style={styles.container} enableBottomPadding={false}>
          <Stack.Screen 
            options={{ 
              headerShown: false,
            }} 
          />
          
          {/* Custom Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              testID="back-button"
            >
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Transaction
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </AndroidSafeContainer>
      </GradientBackground>
    );
  }

  if (error || !explorerData) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <AndroidSafeContainer style={styles.container} enableBottomPadding={false}>
          <Stack.Screen 
            options={{ 
              headerShown: false,
            }} 
          />
          
          {/* Custom Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              testID="back-button"
            >
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Transaction
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error ?? 'Transaction not found'}
            </Text>
          </View>
        </AndroidSafeContainer>
      </GradientBackground>
    );
  }

  const isReceive = transaction?.type === 'received';
  const ArrowIcon = isReceive ? ArrowDownLeft : ArrowUpRight;
  const arrowColor = isReceive ? '#22c55e' : '#ef4444';

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <AndroidSafeContainer style={styles.container} enableBottomPadding={false}>
        <Stack.Screen 
          options={{ 
            headerShown: false,
          }} 
        />
        
        {/* Custom Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            testID="back-button"
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Transaction
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
        >
        {/* Transaction Details Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.transactionHeader}>
            <View style={[styles.transactionIconContainer, { backgroundColor: arrowColor }]}>
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
                {formatCurrency(explorerData.netAmount * (bitcoinPrice?.usd || 0), true)}
              </Text>
            </View>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Fee
            </Text>
            <View style={styles.valueContainer}>
              <Text style={[styles.btcValue, { color: theme.colors.text }]}>
                {explorerData.fee.toFixed(8)} BTC
              </Text>
              <Text style={[styles.usdValue, { color: theme.colors.textSecondary }]}>
                {formatCurrency(explorerData.feeUSD, true)}
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
      </AndroidSafeContainer>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  headerSpacer: {
    width: 32,
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
    padding: 20,
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

const buildExplorerData = (
  txDetails: Transaction,
  bitcoinPrice: { usd?: number } | null,
  currentWallet: Wallet | null,
): TransactionExplorerData => {
  const statusInfo = txDetails.status || {};
  const vinList = Array.isArray(txDetails.inputs) ? txDetails.inputs : txDetails.vin || [];
  const voutList = Array.isArray(txDetails.outputs) ? txDetails.outputs : txDetails.vout || [];

  const normalizeVin = vinList.map((vin: any) => ({
    prevout: vin.prevout || {
      value: vin.value ? Math.round(vin.value * 1e8) : 0,
      scriptpubkey_address: vin.address,
    },
  }));
  const normalizeVout = voutList.map((vout: any) => ({
    value: typeof vout.value === 'number' ? vout.value : Math.round((vout.amount ?? 0) * 1e8),
    scriptpubkey_address: vout.address ?? vout.scriptpubkey_address,
  }));

  const inputValueSats = normalizeVin.reduce((sum, vin) => sum + (vin.prevout?.value ?? 0), 0);
  const outputValueSats = normalizeVout.reduce((sum, vout) => sum + (vout.value ?? 0), 0);
  const feeSats = typeof txDetails.fee === 'number' ? txDetails.fee : (txDetails.fee ?? 0);
  const feeBtc = feeSats / 1e8;

  const addressSet = new Set(currentWallet?.addresses ?? []);
  const fallbackNetAmountSats = (() => {
    if (typeof txDetails.amount === 'number') {
      return Math.round(txDetails.amount * 1e8);
    }

    if (addressSet.size > 0) {
      const received = normalizeVout.reduce((sum, output) =>
        output.scriptpubkey_address && addressSet.has(output.scriptpubkey_address)
          ? sum + (output.value ?? 0)
          : sum,
      0);

      const sent = normalizeVin.reduce((sum, input) =>
        input.prevout?.scriptpubkey_address && addressSet.has(input.prevout.scriptpubkey_address)
          ? sum + (input.prevout?.value ?? 0)
          : sum,
      0);

      return received - sent;
    }

    return 0;
  })();

  const netAmountBtc = typeof (txDetails as any).net_amount === 'number'
    ? (txDetails as any).net_amount / 1e8
    : fallbackNetAmountSats / 1e8;

  const feeUsd = bitcoinPrice?.usd ? feeBtc * bitcoinPrice.usd : 0;
  const feePerVB = (txDetails as any).vsize ? feeSats / (txDetails as any).vsize : 0;

  return {
    txid: txDetails.txid,
    timestamp: ((statusInfo.block_time ?? (txDetails as any).time ?? Math.floor(Date.now() / 1000)) * 1000),
    netAmount: netAmountBtc,
    fee: feeBtc,
    feeUSD: feeUsd,
    confirmations: typeof (txDetails as any).confirmations === 'number'
      ? (txDetails as any).confirmations
      : (statusInfo.confirmed ? 1 : 0),
    blockHeight: statusInfo.block_height ?? 0,
    status: statusInfo.confirmed ? 'confirmed' : 'pending',
    inputValue: inputValueSats / 1e8,
    outputValue: outputValueSats / 1e8,
    feePerVB,
    size: (txDetails as any).size ?? 0,
    weight: (txDetails as any).weight ?? 0,
    version: (txDetails as any).version ?? 0,
    locktime: (txDetails as any).locktime ?? 0,
    rbf: (txDetails as any).rbf ?? false,
    inputs: normalizeVin.map(vin => ({
      address: vin.prevout?.scriptpubkey_address ?? 'Unknown',
      value: (vin.prevout?.value ?? 0) / 1e8,
    })),
    outputs: normalizeVout.map(vout => ({
      address: vout.scriptpubkey_address ?? 'Unknown',
      value: (vout.value ?? 0) / 1e8,
    })),
  };
};