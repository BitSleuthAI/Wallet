import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import { HapticService } from '@/services/haptic-service';
import { CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// Global toast queue
let toastListeners: ((toast: ToastMessage) => void)[] = [];

/**
 * Show a toast notification from anywhere in the app.
 * Call toast.success('Title') or toast.show({ type: 'success', title: 'Title' })
 */
export const toast = {
  show: (config: Omit<ToastMessage, 'id'>) => {
    const message: ToastMessage = {
      ...config,
      id: Date.now().toString() + Math.random().toString(36).slice(2),
    };
    toastListeners.forEach(listener => listener(message));
  },
  success: (title: string, message?: string) => {
    HapticService.success();
    toast.show({ type: 'success', title, message });
  },
  error: (title: string, message?: string) => {
    HapticService.error();
    toast.show({ type: 'error', title, message });
  },
  warning: (title: string, message?: string) => {
    HapticService.warning();
    toast.show({ type: 'warning', title, message });
  },
  info: (title: string, message?: string) => {
    HapticService.light();
    toast.show({ type: 'info', title, message });
  },
};

const ICON_MAP = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

function ToastItem({ item, onDismiss }: { item: ToastMessage; onDismiss: (id: string) => void }) {
  const walletContext = useWallet();
  const theme = walletContext?.theme;

  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    // Animate in
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });

    // Animate out after duration
    const duration = item.duration || 2500;
    const timeout = setTimeout(() => {
      translateY.value = withTiming(-100, { duration: 300, easing: Easing.in(Easing.ease) });
      opacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(onDismiss)(item.id);
      });
      scale.value = withTiming(0.9, { duration: 300 });
    }, duration);

    return () => clearTimeout(timeout);
  }, [item.id, item.duration, translateY, opacity, scale, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const Icon = ICON_MAP[item.type];
  const iconColor = item.type === 'success' ? (theme?.colors.success || '#10B981')
    : item.type === 'error' ? (theme?.colors.error || '#EF4444')
    : item.type === 'warning' ? (theme?.colors.warning || '#F59E0B')
    : (theme?.colors.primary || '#F7931A');

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          backgroundColor: theme?.isDark ? '#1F1F33' : '#FFFFFF',
          borderLeftColor: iconColor,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <Icon color={iconColor} size={20} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme?.colors.text || '#18181B' }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.message && (
          <Text style={[styles.message, { color: theme?.colors.textSecondary || '#8E8E93' }]} numberOfLines={2}>
            {item.message}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * ToastProvider - Renders toast notifications at the top of the screen.
 * Place this component near the root of your app.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (message: ToastMessage) => {
      setToasts(prev => [...prev.slice(-2), message]); // Keep max 3 toasts
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <View style={styles.wrapper}>
      {children}
      <View style={styles.toastContainer} pointerEvents="none">
        {toasts.map(item => (
          <ToastItem key={item.id} item={item} onDismiss={handleDismiss} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: platformStyles.spacing.xl,
    paddingHorizontal: platformStyles.spacing.lg,
    paddingVertical: platformStyles.spacing.md,
    borderRadius: platformStyles.borderRadius.xl,
    borderLeftWidth: 4,
    ...platformStyles.cardShadow,
    maxWidth: 400,
    width: '90%',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  message: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});

export default ToastProvider;
