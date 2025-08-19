import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { WifiOff } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;
const chartHeight = 120;

export default function BalanceChart() {
  const { theme, hasBalanceError, balance, transactions } = useWallet();

  // Show error state only if balance data is unavailable
  if (hasBalanceError) {
    return (
      <View style={[styles.container, styles.errorContainer, { backgroundColor: theme.colors.surface }]}>
        <WifiOff color={theme.colors.error} size={32} />
        <Text style={[styles.errorTitle, { color: theme.colors.error }]}>
          Balance Chart Unavailable
        </Text>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          Unable to load balance history
        </Text>
      </View>
    );
  }

  // Generate balance history based on actual transactions
  const generateBalanceHistory = () => {
    const currentBalance = balance;
    
    // If no transactions, show flat line at current balance
    if (transactions.length === 0) {
      return Array.from({ length: 7 }, (_, i) => ({
        x: i,
        y: currentBalance,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
      }));
    }
    
    // Sort transactions by timestamp (oldest first)
    const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    
    // Create balance history by walking through transactions
    const history: { x: number; y: number; date: Date }[] = [];
    let runningBalance = 0;
    
    // Start from 7 days ago
    const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Add transactions that occurred before or on this date
      const transactionsUpToDate = sortedTransactions.filter(tx => tx.timestamp <= date.getTime());
      
      // Calculate balance at this point in time
      runningBalance = transactionsUpToDate.reduce((balance, tx) => {
        return tx.type === 'received' ? balance + tx.amount : balance - tx.amount;
      }, 0);
      
      history.push({
        x: i,
        y: Math.max(0, runningBalance), // Ensure non-negative balance
        date
      });
    }
    
    return history;
  };
  
  const balanceHistory = generateBalanceHistory();

  const createPath = (data: { x: number; y: number }[]) => {
    const maxY = Math.max(...data.map(d => d.y));
    const minY = Math.min(...data.map(d => d.y));
    const range = maxY - minY || 0.001; // Prevent division by zero

    let path = '';
    
    data.forEach((point, index) => {
      const x = (point.x / (data.length - 1)) * chartWidth;
      // If all values are the same (flat line), center it vertically
      const y = range === 0 ? chartHeight / 2 : chartHeight - ((point.y - minY) / range) * chartHeight;
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    return path;
  };

  // Determine chart color based on balance trend
  const firstBalance = balanceHistory[0]?.y || 0;
  const lastBalance = balanceHistory[balanceHistory.length - 1]?.y || 0;
  const balanceChange = lastBalance - firstBalance;
  const chartColor = balanceChange >= 0 ? theme.colors.success : theme.colors.error;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
          Balance Overview (7D)
        </Text>
        {balanceHistory.length > 1 && (
          <Text style={[styles.chartChange, { color: chartColor }]}>
            {balanceChange >= 0 ? '+' : ''}{balanceChange.toFixed(8)} BTC
          </Text>
        )}
      </View>
      <Svg width={chartWidth} height={chartHeight}>
        <Path
          d={createPath(balanceHistory)}
          stroke={chartColor}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartChange: {
    fontSize: 14,
    fontWeight: '500',
  },
});