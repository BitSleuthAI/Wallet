import { GradientBackground } from '@/components/GradientBackground';
import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import { getTransactionDetails } from '@/services/esplora-service';
import { Transaction } from '@/types/wallet';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Share as ShareIcon,
  XCircle,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function TransactionDetailsScreen() {
  const { txid } = useLocalSearchParams<{ txid: string }>();
  const { theme, transactions, formatCurrency, bitcoinPrice, feeSettings } = useWallet();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const lastTxRef = useRef<Transaction | null>(null);



  useEffect(() => {
    if (txid && transactions) {
      const tx = transactions.find(t => t.txid === txid);
      if (tx) {
        setTransaction(tx);
        lastTxRef.current = tx;
      }
    }
  }, [txid, transactions]);

  const txDetailsQuery = useQuery({
    queryKey: ['transaction-details', txid],
    enabled: !!txid,
    queryFn: async () => {
      if (!txid) {
        return null;
      }
      const result = await getTransactionDetails(txid);
      if (result.error || !result.data) {
        return lastTxRef.current || null;
      }
      return {
        ...(lastTxRef.current || {}),
        ...result.data,
      } as Transaction;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (txDetailsQuery.data) {
      setTransaction(txDetailsQuery.data);
      lastTxRef.current = txDetailsQuery.data;
    }
  }, [txDetailsQuery.data]);



  if (!transaction) {
    return (
      <GradientBackground theme={theme} style={styles.container}>
        <Stack.Screen 
        options={{ 
          title: 'Transaction Details',
          headerStyle: { backgroundColor: 'transparent' },
          headerTransparent: true,
          headerTintColor: theme.colors.text,
        }} 
      />
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Transaction not found
          </Text>
        </View>
      </GradientBackground>
    );
  }

  const isReceived = transaction.type === 'received';
  const amountUSD = bitcoinPrice?.usd ? transaction.amount * bitcoinPrice.usd : 0;
  const isRefreshing = txDetailsQuery.isFetching && lastTxRef.current !== null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'confirmed':
        return <CheckCircle color={theme.colors.success} size={24} />;
      case 'pending':
        return <Clock color="#FFA500" size={24} />;
      case 'failed':
        return <XCircle color={theme.colors.error} size={24} />;
      default:
        return <AlertTriangle color={theme.colors.warning} size={24} />;
    }
  };

  const getStatusText = () => {
    switch (transaction.status) {
      case 'confirmed':
        return `Confirmed (${transaction.confirmations || 0} confirmations)`;
      case 'pending':
        return 'Pending confirmation';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown status';
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', `${label} copied to clipboard`);
    } catch {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const openInExplorer = async () => {
    try {
      const url = `https://app.bitsleuth.ai/transactions/${transaction.txid}`;
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Failed to open block explorer:', error);
      Alert.alert('Error', 'Failed to open block explorer');
    }
  };

  const shareTransaction = async () => {
    try {
      const url = `https://app.bitsleuth.ai/transactions/${transaction.txid}`;
      const message = `Bitcoin Transaction: ${transaction.txid}\n\nAmount: ${isReceived ? '+' : '-'}${transaction.amount.toFixed(8)} BTC\nStatus: ${getStatusText()}\n\nView on explorer: ${url}`;
      
      if (Platform.OS === 'web') {
        await navigator.share({
          title: 'Bitcoin Transaction',
          text: message,
          url: url,
        });
      } else {
        await Share.share({
          message: message,
          url: url,
        });
      }
    } catch {
      // Share failed, ignore silently
    }
  };

  const handleRBF = () => {
    if (!transaction.rbfEligible) {
      Alert.alert(
        'RBF Not Available',
        'Replace-by-Fee is only available for pending transactions that were created with RBF enabled and spend your wallet inputs.'
      );
      return;
    }

    router.push(`/fee-bump?txid=${transaction.txid}&mode=rbf`);
  };

  const handleCPFP = () => {
    if (!transaction.cpfpEligible) {
      Alert.alert(
        'CPFP Not Available',
        'Child-Pays-for-Parent is only available for pending transactions that pay to your wallet.'
      );
      return;
    }

    if (!feeSettings?.enableCPFP) {
      Alert.alert(
        'CPFP Disabled',
        'Enable CPFP in Fee Settings to bump fees on pending transactions you received or sent.'
      );
      return;
    }

    router.push(`/fee-bump?txid=${transaction.txid}&mode=cpfp`);
  };



  return (
    <GradientBackground theme={theme} style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Transaction Details',
          headerStyle: { backgroundColor: 'transparent' },
          headerTransparent: true,
          headerTintColor: theme.colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={shareTransaction} style={styles.headerButton}>
              <ShareIcon color={theme.colors.text} size={20} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* Transaction Header */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.transactionHeader}>
            <View style={[
              styles.iconContainer,
              { backgroundColor: isReceived ? theme.colors.success : theme.colors.error }
            ]}>
              {isReceived ? (
                <ArrowDownLeft color="white" size={32} />
              ) : (
                <ArrowUpRight color="white" size={32} />
              )}
            </View>
            
            <View style={styles.headerContent}>
              <Text style={[styles.transactionType, { color: theme.colors.text }]}>
                {isReceived ? 'Received' : 'Sent'}
              </Text>
              <Text style={[
                styles.amount,
                { color: isReceived ? theme.colors.success : theme.colors.error }
              ]}>
                {isReceived ? '+' : '-'}{transaction.amount.toFixed(8)} BTC
              </Text>
              {amountUSD > 0 && (
                <Text style={[styles.amountUSD, { color: theme.colors.textSecondary }]}>
                  {isReceived ? '+' : '-'}{formatCurrency(amountUSD, false)}
                </Text>
              )}
              {isRefreshing && (
                <View style={styles.refreshRow}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.refreshText, { color: theme.colors.textSecondary }]}>Refreshing…</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Status Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statusSection}>
            {getStatusIcon()}
            <View style={styles.statusContent}>
              <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                Status
              </Text>
              <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>
          
          {transaction.status === 'pending' && transaction.rbf && (
            <TouchableOpacity
              style={[styles.rbfButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleRBF}
              disabled={false}
            >
              <Zap color="white" size={20} />
              <Text style={styles.rbfButtonText}>
                Speed Up (RBF)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Transaction Details */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Date</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatDate(transaction.timestamp)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Address</Text>
            <TouchableOpacity
              style={styles.copyableValue}
              onPress={() => copyToClipboard(transaction.address, 'Address')}
            >
              <Text style={[styles.detailValue, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                {transaction.address}
              </Text>
              <Copy color={theme.colors.textSecondary} size={16} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Transaction ID</Text>
            <TouchableOpacity
              style={styles.copyableValue}
              onPress={() => copyToClipboard(transaction.txid, 'Transaction ID')}
            >
              <Text style={[styles.detailValue, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                {transaction.txid}
              </Text>
              <Copy color={theme.colors.textSecondary} size={16} />
            </TouchableOpacity>
          </View>
          
          {typeof transaction.fee === 'number' && transaction.fee > 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Network Fee</Text>
              <View style={styles.feeContainer}>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {(transaction.fee / 1e8).toFixed(8)} BTC
                  {transaction.feeRate && ` (${Math.round(transaction.feeRate)} sat/vB)`}
                </Text>
                {bitcoinPrice?.usd && (
                  <Text style={[styles.detailValueSecondary, { color: theme.colors.textSecondary }]}>
                    {formatCurrency((transaction.fee / 1e8) * bitcoinPrice.usd, true)}
                  </Text>
                )}
              </View>
            </View>
          )}
          
          {transaction.blockHeight && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Block Height</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {transaction.blockHeight.toLocaleString()}
              </Text>
            </View>
          )}
          
          {transaction.memo && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Memo</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {transaction.memo}
              </Text>
            </View>
          )}

          {/* RBF and CPFP Information */}
          {(transaction.rbf || transaction.cpfp || transaction.childTxids) && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Features</Text>
              <View style={styles.featureTags}>
                {transaction.rbf && (
                  <View style={[styles.featureTag, { backgroundColor: theme.colors.warning + '20' }]}> 
                    <Zap color={theme.colors.warning} size={12} />
                    <Text style={[styles.featureTagText, { color: theme.colors.warning }]}>
                      RBF Enabled
                    </Text>
                  </View>
                )}
                {transaction.cpfp && (
                  <View style={[styles.featureTag, { backgroundColor: theme.colors.success + '20' }]}> 
                    <DollarSign color={theme.colors.success} size={12} />
                    <Text style={[styles.featureTagText, { color: theme.colors.success }]}>
                      CPFP Child
                    </Text>
                  </View>
                )}
                {transaction.childTxids && transaction.childTxids.length > 0 && (
                  <View style={[styles.featureTag, { backgroundColor: theme.colors.primary + '20' }]}>
                    <DollarSign color={theme.colors.primary} size={12} />
                    <Text style={[styles.featureTagText, { color: theme.colors.primary }]}>
                      CPFP Parent ({transaction.childTxids.length} child{transaction.childTxids.length > 1 ? 'ren' : ''})
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={openInExplorer}>
            <ExternalLink color={theme.colors.primary} size={20} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
              View on Block Explorer
            </Text>
          </TouchableOpacity>

          {/* RBF Button for sent transactions */}
          {!isReceived && transaction.status === 'pending' && feeSettings?.enableRBF !== false && (
            <TouchableOpacity
              style={[styles.actionButton, (!transaction.rbfEligible) && styles.disabledActionButton]}
              onPress={handleRBF}
              disabled={!transaction.rbfEligible}
            >
              <Zap color={transaction.rbfEligible ? theme.colors.warning : theme.colors.textSecondary} size={20} />
              <Text
                style={[styles.actionButtonText, { color: transaction.rbfEligible ? theme.colors.text : theme.colors.textSecondary }]}
              >
                Replace-by-Fee (RBF)
              </Text>
            </TouchableOpacity>
          )}

          {/* CPFP Button for pending transactions when enabled */}
          {transaction.status === 'pending' && feeSettings?.enableCPFP !== false && (
            <TouchableOpacity
              style={[styles.actionButton, (!transaction.cpfpEligible || !feeSettings?.enableCPFP) && styles.disabledActionButton]}
              onPress={handleCPFP}
              disabled={!transaction.cpfpEligible || !feeSettings?.enableCPFP}
            >
              <Zap color={transaction.cpfpEligible && feeSettings?.enableCPFP ? theme.colors.success : theme.colors.textSecondary} size={20} />
              <Text
                style={[styles.actionButtonText, { color: transaction.cpfpEligible && feeSettings?.enableCPFP ? theme.colors.text : theme.colors.textSecondary }]}
              >
                Child-Pays-for-Parent (CPFP)
              </Text>
            </TouchableOpacity>
          )}
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
    paddingTop: 90, // Reduced padding to move content higher
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...platformStyles.typography.bodyLarge,
    textAlign: 'center',
  },
  section: {
    margin: platformStyles.spacing.lg,
    padding: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.large,
    ...platformStyles.shadow,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  transactionType: {
    ...platformStyles.typography.bodyLarge,
    fontWeight: '600',
    marginBottom: platformStyles.spacing.xs,
  },
  amount: {
    ...platformStyles.typography.heading,
    marginBottom: platformStyles.spacing.xs,
  },
  amountUSD: {
    ...platformStyles.typography.body,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.lg,
  },
  statusContent: {
    marginLeft: platformStyles.spacing.md,
    flex: 1,
  },
  statusTitle: {
    ...platformStyles.typography.bodyLarge,
    fontWeight: '600',
    marginBottom: platformStyles.spacing.xs,
  },
  statusText: {
    ...platformStyles.typography.body,
  },
  rbfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.medium,
    marginTop: platformStyles.spacing.md,
  },
  rbfButtonText: {
    color: 'white',
    ...platformStyles.typography.bodyLarge,
    fontWeight: '600',
    marginLeft: platformStyles.spacing.sm,
  },
  sectionTitle: {
    ...platformStyles.typography.title,
    marginBottom: platformStyles.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: platformStyles.spacing.md,
    minHeight: 24,
  },
  detailLabel: {
    ...platformStyles.typography.body,
    flex: 1,
    marginRight: platformStyles.spacing.md,
  },
  detailValue: {
    ...platformStyles.typography.body,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  copyableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.medium,
    marginBottom: platformStyles.spacing.sm,
  },
  actionButtonText: {
    ...platformStyles.typography.bodyLarge,
    marginLeft: platformStyles.spacing.md,
  },
  headerButton: {
    padding: platformStyles.spacing.sm,
  },
  featureTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featureTagText: {
    ...platformStyles.typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  feeContainer: {
    alignItems: 'flex-end',
  },
  detailValueSecondary: {
    ...platformStyles.typography.body,
    fontSize: 13,
    marginTop: 2,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: platformStyles.spacing.sm,
  },
  refreshText: {
    marginLeft: platformStyles.spacing.sm,
  },
});