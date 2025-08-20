import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { WifiOff } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;
const chartHeight = 200;
const chartPadding = 20;

interface DataPoint {
  x: number;
  y: number;
  date: Date;
  balance: number;
}

type TimePeriod = '1D' | '1W' | '1M' | '1Y' | 'All';

interface BalanceChartProps {
  selectedPeriod: TimePeriod;
}

export default function BalanceChart({ selectedPeriod }: BalanceChartProps) {
  const { theme, hasBalanceError, balance, transactions, bitcoinPrice, formatCurrency } = useWallet();
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

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
  const generateBalanceHistory = (): DataPoint[] => {
    const currentBalance = balance;
    
    // Calculate days based on selected period
    const getDaysForPeriod = (period: TimePeriod): number => {
      switch (period) {
        case '1D': return 1;
        case '1W': return 7;
        case '1M': return 30;
        case '1Y': return 365;
        case 'All': return Math.max(365, transactions.length > 0 ? 
          Math.ceil((Date.now() - Math.min(...transactions.map(tx => tx.timestamp))) / (24 * 60 * 60 * 1000)) : 365);
        default: return 30;
      }
    };
    
    const days = getDaysForPeriod(selectedPeriod);
    
    // If no transactions, show flat line at current balance
    if (transactions.length === 0) {
      const dataPoints = selectedPeriod === '1D' ? 24 : Math.min(days, 100); // Limit data points for performance
      const interval = selectedPeriod === '1D' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 1 hour for 1D, 1 day for others
      
      return Array.from({ length: dataPoints }, (_, i) => ({
        x: i,
        y: currentBalance,
        balance: currentBalance,
        date: new Date(Date.now() - (dataPoints - 1 - i) * interval)
      }));
    }
    
    // Sort transactions by oldest first
    const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    
    // Create balance history by walking through transactions
    const history: DataPoint[] = [];
    let runningBalance = 0;
    
    // Calculate interval and data points based on period
    const dataPoints = selectedPeriod === '1D' ? 24 : Math.min(days, 100);
    const interval = selectedPeriod === '1D' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    // Start from the beginning of the period
    const startDate = new Date(Date.now() - (dataPoints - 1) * interval);
    
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(startDate.getTime() + i * interval);
      
      // Add transactions that occurred before or on this date
      const transactionsUpToDate = sortedTransactions.filter(tx => tx.timestamp <= date.getTime());
      
      // Calculate balance at this point in time
      runningBalance = transactionsUpToDate.reduce((balance, tx) => {
        return tx.type === 'received' ? balance + tx.amount : balance - tx.amount;
      }, 0);
      
      const balanceValue = Math.max(0, runningBalance);
      history.push({
        x: i,
        y: balanceValue,
        balance: balanceValue,
        date
      });
    }
    
    return history;
  };
  
  const balanceHistory = generateBalanceHistory();

  const createPath = (data: DataPoint[]) => {
    const maxY = Math.max(...data.map(d => d.y));
    const minY = Math.min(...data.map(d => d.y));
    const range = maxY - minY || 0.001;

    let path = '';
    let gradientPath = '';
    
    data.forEach((point, index) => {
      const x = chartPadding + (point.x / (data.length - 1)) * (chartWidth - 2 * chartPadding);
      const y = chartPadding + (range === 0 ? (chartHeight - 2 * chartPadding) / 2 : (chartHeight - 2 * chartPadding) - ((point.y - minY) / range) * (chartHeight - 2 * chartPadding));
      
      if (index === 0) {
        path += `M ${x} ${y}`;
        gradientPath += `M ${x} ${chartHeight - chartPadding} L ${x} ${y}`;
      } else {
        // Create smooth curves using quadratic bezier
        const prevPoint = data[index - 1];
        const prevX = chartPadding + (prevPoint.x / (data.length - 1)) * (chartWidth - 2 * chartPadding);
        const prevY = chartPadding + (range === 0 ? (chartHeight - 2 * chartPadding) / 2 : (chartHeight - 2 * chartPadding) - ((prevPoint.y - minY) / range) * (chartHeight - 2 * chartPadding));
        
        const cpX = (prevX + x) / 2;
        
        path += ` Q ${cpX} ${prevY} ${x} ${y}`;
        gradientPath += ` Q ${cpX} ${prevY} ${x} ${y}`;
      }
    });

    // Close the gradient path
    const lastX = chartPadding + ((data.length - 1) / (data.length - 1)) * (chartWidth - 2 * chartPadding);
    gradientPath += ` L ${lastX} ${chartHeight - chartPadding} Z`;

    return { linePath: path, gradientPath };
  };

  const getPointAtX = (x: number, data: DataPoint[]) => {
    const relativeX = (x - chartPadding) / (chartWidth - 2 * chartPadding);
    const index = Math.round(relativeX * (data.length - 1));
    return data[Math.max(0, Math.min(index, data.length - 1))];
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX } = evt.nativeEvent;
      const point = getPointAtX(locationX, balanceHistory);
      setSelectedPoint(point);
      setShowTooltip(true);
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    },
    onPanResponderMove: (evt) => {
      const { locationX } = evt.nativeEvent;
      const point = getPointAtX(locationX, balanceHistory);
      setSelectedPoint(point);
    },
    onPanResponderRelease: () => {
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowTooltip(false);
        setSelectedPoint(null);
      });
    },
  });

  const formatDate = (date: Date) => {
    switch (selectedPeriod) {
      case '1D':
        return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      case '1W':
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      case '1M':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case '1Y':
        return date.toLocaleDateString('en-US', { month: 'short' });
      case 'All':
        return date.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatTooltipDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getTimeRangeLabels = (data: DataPoint[]) => {
    if (data.length === 0) return [];
    
    const labels = [];
    const step = Math.floor(data.length / 5); // Show 5 labels
    
    for (let i = 0; i < data.length; i += step) {
      if (i < data.length) {
        labels.push({
          x: chartPadding + (i / (data.length - 1)) * (chartWidth - 2 * chartPadding),
          label: formatDate(data[i].date)
        });
      }
    }
    
    return labels;
  };

  // Determine chart color based on balance trend
  const firstBalance = balanceHistory[0]?.y || 0;
  const lastBalance = balanceHistory[balanceHistory.length - 1]?.y || 0;
  const balanceChange = lastBalance - firstBalance;
  const isPositive = balanceChange >= 0;
  const chartColor = isPositive ? '#8B5CF6' : '#EF4444';
  const gradientStartColor = isPositive ? '#8B5CF6' : '#EF4444';
  const gradientEndColor = isPositive ? 'rgba(139, 92, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)';
  
  const { linePath, gradientPath } = createPath(balanceHistory);
  const timeLabels = getTimeRangeLabels(balanceHistory);
  
  const getSelectedPointPosition = () => {
    if (!selectedPoint) return { x: 0, y: 0 };
    
    const maxY = Math.max(...balanceHistory.map(d => d.y));
    const minY = Math.min(...balanceHistory.map(d => d.y));
    const range = maxY - minY || 0.001;
    
    const x = chartPadding + (selectedPoint.x / (balanceHistory.length - 1)) * (chartWidth - 2 * chartPadding);
    const y = chartPadding + (range === 0 ? (chartHeight - 2 * chartPadding) / 2 : (chartHeight - 2 * chartPadding) - ((selectedPoint.y - minY) / range) * (chartHeight - 2 * chartPadding));
    
    return { x, y };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
          Balance Overview ({selectedPeriod})
        </Text>
        {balanceHistory.length > 1 && (
          <Text style={[styles.chartChange, { color: chartColor }]}>
            {balanceChange >= 0 ? '+' : ''}{balanceChange.toFixed(8)} BTC
          </Text>
        )}
      </View>
      
      <View style={styles.chartContainer} {...panResponder.panHandlers}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={gradientStartColor} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={gradientEndColor} stopOpacity="0.1" />
            </LinearGradient>
          </Defs>
          
          {/* Gradient fill */}
          <Path
            d={gradientPath}
            fill="url(#gradient)"
          />
          
          {/* Line path */}
          <Path
            d={linePath}
            stroke={chartColor}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Interactive point */}
          {showTooltip && selectedPoint && (
            <Circle
              cx={getSelectedPointPosition().x}
              cy={getSelectedPointPosition().y}
              r="6"
              fill={chartColor}
              stroke="white"
              strokeWidth="3"
            />
          )}
        </Svg>
        
        {/* Tooltip */}
        {showTooltip && selectedPoint && (
          <Animated.View 
            style={[
              styles.tooltip,
              {
                opacity: tooltipOpacity,
                left: Math.max(10, Math.min(getSelectedPointPosition().x - 60, chartWidth - 130)),
                top: Math.max(10, getSelectedPointPosition().y - 80),
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }
            ]}
          >
            <View style={styles.tooltipContent}>
              <Text style={[styles.tooltipTitle, { color: theme.colors.text }]}>Balance</Text>
              <Text style={[styles.tooltipBTC, { color: theme.colors.text }]}>
                {selectedPoint.balance.toFixed(8)} BTC
              </Text>
              {bitcoinPrice?.usd && (
                <Text style={[styles.tooltipFiat, { color: theme.colors.textSecondary }]}>
                  {formatCurrency(selectedPoint.balance * bitcoinPrice.usd)}
                </Text>
              )}
              <Text style={[styles.tooltipDate, { color: theme.colors.textSecondary }]}>
                {formatTooltipDate(selectedPoint.date)}
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
      
      {/* Time labels */}
      <View style={styles.timeLabelsContainer}>
        {timeLabels.map((label, index) => (
          <Text 
            key={index}
            style={[
              styles.timeLabel, 
              { 
                color: theme.colors.textSecondary,
                left: label.x - 20
              }
            ]}
          >
            {label.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    position: 'relative',
    width: chartWidth,
    height: chartHeight,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 140,
  },
  tooltipContent: {
    alignItems: 'flex-start',
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.7,
  },
  tooltipBTC: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  tooltipFiat: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  timeLabelsContainer: {
    position: 'relative',
    width: chartWidth,
    height: 20,
    marginTop: 12,
  },
  timeLabel: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '500',
    width: 40,
    textAlign: 'center',
  },
});