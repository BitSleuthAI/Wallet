import { platformStyles } from '@/constants/themes';
import { useTheme } from '@/hooks/theme-store';
import { useWallet } from '@/hooks/wallet-store';
import { HapticService } from '@/services/haptic-service';
import { BitcoinPrice, Theme, Transaction } from '@/types/wallet';
import { router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Clock, DollarSign, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface TransactionItemProps {
  transaction: Transaction;
  index?: number;
}

interface TransactionItemContentProps extends TransactionItemProps {
  theme: Theme;
  bitcoinPrice: BitcoinPrice | null | undefined;
  hasPriceError: boolean;
  formatCurrency: (amount: number, showSymbol?: boolean) => string;
}

// Thin wrapper subscribes to the stores; the memoized content below only
// re-renders when its own props actually change, so list rows stay idle
// during the 30s wallet data polls.
export default function TransactionItem({ transaction, index = 0 }: TransactionItemProps) {
  const walletContext = useWallet();
  const { theme } = useTheme();

  if (!walletContext) {
    return null;
  }

  return (
    <TransactionItemContent
      transaction={transaction}
      index={index}
      theme={theme}
      bitcoinPrice={walletContext.bitcoinPrice}
      hasPriceError={walletContext.hasPriceError}
      formatCurrency={walletContext.formatCurrency}
    />
  );
}

const TransactionItemContent = React.memo(function TransactionItemContent({
  transaction,
  index = 0,
  theme,
  bitcoinPrice,
  hasPriceError,
  formatCurrency,
}: TransactionItemContentProps) {
  const isReceived = transaction.type === 'received';
  const amountUSD = !hasPriceError && bitcoinPrice?.usd ? transaction.amount * bitcoinPrice.usd : 0;

  // Animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  // Icon entrance animation
  const iconScale = useSharedValue(0);
  useEffect(() => {
    iconScale.value = withSpring(1, { damping: 12, stiffness: 200, mass: 0.8 });
  }, [iconScale]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
  }));

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const handlePressIn = useCallback(() => {
    HapticService.light();
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePress = useCallback(() => {
    HapticService.medium();

    const direction = isReceived ? -4 : 4;
    translateX.value = withSequence(
      withTiming(direction, { duration: 100, easing: Easing.out(Easing.ease) }),
      withSpring(0, { damping: 15, stiffness: 300 })
    );

    router.push({
      pathname: '/transaction-explorer',
      params: { txid: transaction.txid },
    });
  }, [translateX, transaction.txid, isReceived]);

  const getStatusColor = () => {
    if (transaction.status === 'confirmed') {
      return theme.colors.success;
    }
    return theme.colors.warning;
  };

  // Staggered entrance animation, capped so long lists don't queue
  // multi-second delays as rows mount during scrolling
  const enteringAnimation = FadeInDown.delay(Math.min(index, 8) * 60).duration(400).springify().damping(15);

  return (
    <Animated.View entering={enteringAnimation}>
      <AnimatedTouchable
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
          },
          animatedStyle,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Transaction direction icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isReceived
                ? theme.colors.success + '15'
                : theme.colors.error + '15',
            },
            iconAnimatedStyle,
          ]}
        >
          {isReceived ? (
            <ArrowDownLeft color={theme.colors.success} size={20} strokeWidth={2.5} />
          ) : (
            <ArrowUpRight color={theme.colors.error} size={20} strokeWidth={2.5} />
          )}
        </Animated.View>

        <View style={styles.content}>
          {/* Top row: Type + Amount */}
          <View style={styles.header}>
            <Text style={[styles.type, { color: theme.colors.text }]}>
              {isReceived ? 'Received' : 'Sent'}
            </Text>
            <Text style={[
              styles.amount,
              { color: isReceived ? theme.colors.success : theme.colors.error }
            ]}>
              {isReceived ? '+' : '-'}{transaction.amount.toFixed(8)} BTC
            </Text>
          </View>

          {/* Middle row: Date + USD amount */}
          <View style={styles.details}>
            <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
              {formatDate(transaction.timestamp)}
            </Text>
            {!hasPriceError && amountUSD > 0 ? (
              <Text style={[styles.amountUSD, { color: theme.colors.textSecondary }]}>
                {isReceived ? '+' : '-'}{formatCurrency(amountUSD)}
              </Text>
            ) : (
              <Text style={[styles.amountUSD, { color: theme.colors.textSecondary }]}>
                Fiat unavailable
              </Text>
            )}
          </View>

          {/* Bottom row: Status + Features */}
          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: getStatusColor() + '15',
              }
            ]}>
              {transaction.status === 'confirmed' ? (
                <CheckCircle color={getStatusColor()} size={12} />
              ) : (
                <Clock color={getStatusColor()} size={12} />
              )}
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {transaction.status === 'confirmed' ? 'Confirmed' : 'Pending'}
              </Text>
            </View>

            {/* Feature indicators */}
            <View style={styles.featureIndicators}>
              {transaction.rbf && (
                <View style={[styles.featureBadge, { backgroundColor: theme.colors.warning + '15' }]}>
                  <Zap color={theme.colors.warning} size={10} />
                  <Text style={[styles.featureText, { color: theme.colors.warning }]}>RBF</Text>
                </View>
              )}
              {transaction.cpfp && (
                <View style={[styles.featureBadge, { backgroundColor: theme.colors.success + '15' }]}>
                  <DollarSign color={theme.colors.success} size={10} />
                  <Text style={[styles.featureText, { color: theme.colors.success }]}>CPFP</Text>
                </View>
              )}
              {transaction.childTxids && transaction.childTxids.length > 0 && (
                <View style={[styles.featureBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                  <DollarSign color={theme.colors.primary} size={10} />
                  <Text style={[styles.featureText, { color: theme.colors.primary }]}>Parent</Text>
                </View>
              )}
            </View>
          </View>

          {/* Address */}
          <Text style={[styles.address, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {isReceived ? 'From' : 'To'}: {truncateAddress(transaction.address)}
          </Text>
        </View>
      </AnimatedTouchable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: platformStyles.spacing.lg,
    marginVertical: platformStyles.spacing.xs,
    marginHorizontal: platformStyles.spacing.xs,
    borderRadius: platformStyles.borderRadius.xl,
    alignItems: 'flex-start',
    ...platformStyles.shadow,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  type: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  amount: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.sm,
  },
  date: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  amountUSD: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  featureIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  featureText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  address: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: 'monospace',
  },
});
