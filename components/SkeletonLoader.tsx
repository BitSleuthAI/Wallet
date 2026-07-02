import { platformStyles } from '@/constants/themes';
import { useTheme } from '@/hooks/theme-store';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

/**
 * Skeleton - A shimmer loading placeholder that creates a premium loading experience.
 * Replaces plain "Loading..." text with animated shimmer bars that match the layout.
 */
function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const { theme } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.7, 0.3]);
    return { opacity };
  });

  const baseColor = theme.colors.border;

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * WalletCardSkeleton - Skeleton placeholder for the wallet card carousel.
 */
export function WalletCardSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={[skeletonStyles.walletCard, { backgroundColor: theme.colors.surface }]}>
      <View style={skeletonStyles.walletCardHeader}>
        <Skeleton width={120} height={20} borderRadius={10} />
        <Skeleton width={32} height={32} borderRadius={16} />
      </View>
      <View style={skeletonStyles.walletCardBody}>
        <Skeleton width={180} height={28} borderRadius={14} />
        <Skeleton width={100} height={18} borderRadius={9} style={{ marginTop: 8 }} />
      </View>
      <View style={skeletonStyles.walletCardFooter}>
        <Skeleton width={80} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

/**
 * BalanceSkeleton - Skeleton placeholder for the balance display area.
 */
export function BalanceSkeleton() {
  return (
    <View style={skeletonStyles.balanceContainer}>
      <Skeleton width={220} height={48} borderRadius={24} />
      <Skeleton width={140} height={20} borderRadius={10} style={{ marginTop: 12 }} />
      <Skeleton width={100} height={16} borderRadius={8} style={{ marginTop: 8 }} />
    </View>
  );
}

/**
 * TransactionSkeleton - Skeleton placeholder for a single transaction item.
 */
export function TransactionSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={[skeletonStyles.transactionItem, { backgroundColor: theme.colors.surface }]}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={skeletonStyles.transactionContent}>
        <View style={skeletonStyles.transactionRow}>
          <Skeleton width={70} height={16} borderRadius={8} />
          <Skeleton width={110} height={16} borderRadius={8} />
        </View>
        <View style={[skeletonStyles.transactionRow, { marginTop: 8 }]}>
          <Skeleton width={100} height={14} borderRadius={7} />
          <Skeleton width={60} height={14} borderRadius={7} />
        </View>
        <View style={[skeletonStyles.transactionRow, { marginTop: 8 }]}>
          <Skeleton width={80} height={22} borderRadius={11} />
        </View>
      </View>
    </View>
  );
}

/**
 * TransactionListSkeleton - Multiple transaction skeletons for list loading state.
 */
export function TransactionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <TransactionSkeleton key={i} />
      ))}
    </View>
  );
}

/**
 * ChartSkeleton - Skeleton placeholder for the price chart area.
 */
export function ChartSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={[skeletonStyles.chartContainer, { backgroundColor: theme.colors.surface }]}>
      <Skeleton width="100%" height={180} borderRadius={16} />
    </View>
  );
}

/**
 * HomeScreenSkeleton - Full skeleton for the home screen loading state.
 */
export function HomeScreenSkeleton() {
  return (
    <View style={skeletonStyles.homeContainer}>
      {/* Header skeleton */}
      <View style={skeletonStyles.headerSkeleton}>
        <View>
          <Skeleton width={140} height={28} borderRadius={14} />
          <Skeleton width={100} height={16} borderRadius={8} style={{ marginTop: 8 }} />
        </View>
        <View style={skeletonStyles.priceSkeletonContainer}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={{ marginLeft: 12 }}>
            <Skeleton width={80} height={14} borderRadius={7} />
            <Skeleton width={100} height={16} borderRadius={8} style={{ marginTop: 4 }} />
          </View>
        </View>
      </View>

      {/* Wallet card skeleton */}
      <WalletCardSkeleton />

      {/* Balance skeleton */}
      <BalanceSkeleton />

      {/* Period selector skeleton */}
      <View style={skeletonStyles.periodSkeleton}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={52} height={36} borderRadius={18} />
        ))}
      </View>

      {/* Chart skeleton */}
      <ChartSkeleton />

      {/* Action buttons skeleton */}
      <View style={skeletonStyles.actionSkeleton}>
        <Skeleton width="48%" height={56} borderRadius={28} />
        <Skeleton width="48%" height={56} borderRadius={28} />
      </View>

      {/* Transaction list skeleton */}
      <TransactionListSkeleton count={3} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  homeContainer: {
    padding: platformStyles.spacing.xl,
    gap: platformStyles.spacing.xl,
  },
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: platformStyles.spacing.xl,
  },
  priceSkeletonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletCard: {
    width: 340,
    height: 200,
    borderRadius: platformStyles.borderRadius.xxxl,
    padding: platformStyles.spacing.xxl,
    justifyContent: 'space-between',
  },
  walletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walletCardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  walletCardFooter: {
    alignItems: 'flex-end',
  },
  balanceContainer: {
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.xl,
  },
  transactionItem: {
    flexDirection: 'row',
    padding: platformStyles.spacing.xl,
    marginVertical: platformStyles.spacing.sm,
    borderRadius: platformStyles.borderRadius.xl,
    alignItems: 'flex-start',
  },
  transactionContent: {
    flex: 1,
    marginLeft: platformStyles.spacing.lg,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: platformStyles.spacing.lg,
  },
  chartContainer: {
    borderRadius: platformStyles.borderRadius.xxl,
    padding: platformStyles.spacing.lg,
    overflow: 'hidden',
  },
  actionSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default Skeleton;
