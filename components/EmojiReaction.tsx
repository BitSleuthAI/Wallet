import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface EmojiReactionProps {
  action: 'success' | 'error' | 'warning' | 'loading' | 'complete' | 'milestone' | 'balance-up' | 'balance-down';
  message?: string;
  duration?: number;
  onComplete?: () => void;
}

export default function EmojiReaction({
  action,
  message,
  duration = 2000,
  onComplete,
}: EmojiReactionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  // Contextual emoji and message mapping
  const getReactionConfig = () => {
    switch (action) {
      case 'success':
        return {
          emoji: '🎉',
          color: '#2ECC71',
          message: message || 'Success!',
        };
      case 'error':
        return {
          emoji: '😅',
          color: '#E74C3C',
          message: message || 'Oops!',
        };
      case 'warning':
        return {
          emoji: '⚠️',
          color: '#F39C12',
          message: message || 'Heads up!',
        };
      case 'loading':
        return {
          emoji: '⏳',
          color: '#3498DB',
          message: message || 'Loading...',
        };
      case 'complete':
        return {
          emoji: '✅',
          color: '#27AE60',
          message: message || 'Complete!',
        };
      case 'milestone':
        return {
          emoji: '🏆',
          color: '#F1C40F',
          message: message || 'Milestone reached!',
        };
      case 'balance-up':
        return {
          emoji: '📈',
          color: '#2ECC71',
          message: message || 'Balance increased!',
        };
      case 'balance-down':
        return {
          emoji: '📉',
          color: '#E74C3C',
          message: message || 'Balance decreased',
        };
      default:
        return {
          emoji: '✨',
          color: '#9B59B6',
          message: message || 'Action completed',
        };
    }
  };

  const config = getReactionConfig();

  useEffect(() => {
    if (action) {
      showReaction();
    }
  }, [action]);

  const showReaction = () => {
    setIsVisible(true);
    
    // Animate in
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after duration
    setTimeout(() => {
      hideReaction();
    }, duration);
  };

  const hideReaction = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      onComplete?.();
    });
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.reactionContainer,
          {
            backgroundColor: config.color,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={styles.emoji}>{config.emoji}</Text>
        <Text style={styles.message}>{config.message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 1000,
  },
  reactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ translateX: -50 }, { translateY: -25 }],
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  message: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
