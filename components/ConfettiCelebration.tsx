import { HapticService } from '@/services/haptic-service';
import React, { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const { height: screenHeight } = Dimensions.get('window');

interface ConfettiCelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
  type?: 'success' | 'milestone' | 'wallet-created' | 'transaction-complete' | 'balance-update';
  position?: 'top' | 'center' | 'bottom';
}

export default function ConfettiCelebration({
  isVisible,
  onComplete,
  type = 'success',
  position = 'center',
}: ConfettiCelebrationProps) {
  const confettiRef = useRef<ConfettiCannon>(null);

  // Configuration for different celebration types
  const getConfettiConfig = () => {
    switch (type) {
      case 'success':
        return {
          colors: ['#2ECC71', '#27AE60', '#58D68D'], // Green success colors
          count: 200,
          origin: { x: -10, y: 0 },
          autoStart: false,
          fadeOut: true,
        };
      case 'milestone':
        return {
          colors: ['#F1C40F', '#F39C12', '#E67E22'], // Gold milestone colors
          count: 300,
          origin: { x: -10, y: 0 },
          autoStart: false,
          fadeOut: true,
        };
      case 'wallet-created':
        return {
          colors: ['#9B59B6', '#8E44AD', '#E91E63'], // Purple/pink wallet colors
          count: 250,
          origin: { x: -10, y: 0 },
          autoStart: false,
          fadeOut: true,
        };
      case 'transaction-complete':
        return {
          colors: ['#3498DB', '#2980B9', '#5DADE2'], // Blue transaction colors
          count: 180,
          origin: { x: -10, y: 0 },
          autoStart: false,
          fadeOut: true,
        };
      case 'balance-update':
        return {
          colors: ['#1ABC9C', '#16A085', '#48C9B0'], // Teal balance colors
          count: 150,
          origin: { x: -10, y: 0 },
          autoStart: false,
          fadeOut: true,
        };
      default:
        return {
          colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'], // Default brand colors
          count: 200,
          origin: { x: -10, y: 0 },
          autoStart: false,
          fadeOut: true,
        };
    }
  };

  // Position configuration
  const getPositionStyle = (): { top?: number; bottom?: number } => {
    switch (position) {
      case 'top':
        return { top: 100 };
      case 'center':
        return { top: screenHeight / 2 };
      case 'bottom':
        return { bottom: 100 };
      default:
        return { top: screenHeight / 2 };
    }
  };

  useEffect(() => {
    if (isVisible && confettiRef.current) {
      // Trigger haptic feedback based on celebration type
      switch (type) {
        case 'success':
          HapticService.success();
          break;
        case 'milestone':
          HapticService.heavy();
          break;
        case 'wallet-created':
          HapticService.walletCreated();
          break;
        case 'transaction-complete':
          HapticService.transactionSuccess();
          break;
        case 'balance-update':
          HapticService.balanceUpdate();
          break;
      }

      // Start confetti animation
      confettiRef.current.start();
      
      // Call onComplete after animation duration
      setTimeout(() => {
        onComplete?.();
      }, 3000);
    }
  }, [isVisible, type, onComplete]);

  if (!isVisible) return null;

  return (
    <View style={[styles.container, getPositionStyle()]}>
      <ConfettiCannon
        ref={confettiRef}
        {...getConfettiConfig()}
        onAnimationEnd={onComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});
