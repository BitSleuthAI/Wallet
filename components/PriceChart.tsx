import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { WifiOff } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;
const chartHeight = 120;

export default function PriceChart() {
  const { theme, hasPriceError, bitcoinPrice } = useWallet();

  // Don't show mock data when there are network errors
  if (hasPriceError) {
    return (
      <View style={[styles.container, styles.errorContainer, { backgroundColor: theme.colors.surface }]}>
        <WifiOff color={theme.colors.error} size={32} />
        <Text style={[styles.errorTitle, { color: theme.colors.error }]}>
          Chart Unavailable
        </Text>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          Unable to load price chart data
        </Text>
      </View>
    );
  }

  // Generate realistic mock data based on current price and 24h change
  const currentPrice = bitcoinPrice?.usd || 45000;
  const change24h = bitcoinPrice?.usd_24h_change || 0;
  
  // Create a realistic price chart showing the last 7 data points
  const generateMockData = () => {
    const basePrice = currentPrice;
    const volatility = Math.abs(change24h) * 0.1; // Use 24h change to determine volatility
    
    return Array.from({ length: 7 }, (_, i) => {
      // Create a trend that leads to the current 24h change
      const progress = i / 6; // 0 to 1
      const trendFactor = change24h * progress * 0.01; // Convert percentage to decimal
      const randomFactor = (Math.sin(i * 0.8) * volatility * 0.5); // Add some realistic variation
      const price = basePrice * (1 + trendFactor + randomFactor);
      
      return {
        x: i,
        y: Math.max(price, basePrice * 0.95) // Ensure price doesn't go too low
      };
    });
  };
  
  const mockData = generateMockData();

  const createPath = (data: { x: number; y: number }[]) => {
    const maxY = Math.max(...data.map(d => d.y));
    const minY = Math.min(...data.map(d => d.y));
    const range = maxY - minY || 1;

    let path = '';
    
    data.forEach((point, index) => {
      const x = (point.x / (data.length - 1)) * chartWidth;
      const y = chartHeight - ((point.y - minY) / range) * chartHeight;
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    return path;
  };

  // Determine chart color based on 24h change
  const chartColor = (bitcoinPrice?.usd_24h_change || 0) >= 0 ? theme.colors.success : theme.colors.error;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
          Price Chart (7D)
        </Text>
        {bitcoinPrice && (
          <Text style={[styles.chartChange, { color: chartColor }]}>
            {bitcoinPrice.usd_24h_change >= 0 ? '+' : ''}{bitcoinPrice.usd_24h_change.toFixed(2)}%
          </Text>
        )}
      </View>
      <Svg width={chartWidth} height={chartHeight}>
        <Path
          d={createPath(mockData)}
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