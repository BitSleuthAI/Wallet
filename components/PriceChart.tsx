import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useWallet } from '@/hooks/wallet-store';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;
const chartHeight = 120;

export default function PriceChart() {
  const { theme } = useWallet();

  // Mock data for the chart - in a real app, you'd fetch historical price data
  const mockData = [
    { x: 0, y: 50 },
    { x: 1, y: 45 },
    { x: 2, y: 40 },
    { x: 3, y: 55 },
    { x: 4, y: 60 },
    { x: 5, y: 65 },
    { x: 6, y: 70 },
  ];

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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Svg width={chartWidth} height={chartHeight}>
        <Path
          d={createPath(mockData)}
          stroke={theme.colors.primary}
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
});