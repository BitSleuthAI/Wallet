import { useTheme } from '@/hooks/theme-store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { theme, isDark } = useTheme();

  return (
    <NativeTabs
      // NativeTabs needs a remount to fully re-apply colors, but only when the
      // resolved appearance actually flips — not on every theme object change
      key={isDark ? 'dark' : 'light'}
      // Tint color for active tabs
      tintColor={theme.colors.primary}
      // Icon colors for default and selected states
      // In light mode, use darker color (almost black) for better visibility
      // In dark mode, use textSecondary for softer appearance
      iconColor={{
        default: theme.isDark ? theme.colors.textSecondary : '#1F2937',
        selected: theme.colors.primary,
      }}
      // Label styling - unselected state uses textSecondary, selected uses tintColor
      labelStyle={{
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
      }}
      // iOS 26+ liquid glass tab bar with minimize behavior
      minimizeBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
      // Android: always show labels
      labelVisibilityMode="labeled"
      // Blur effect for tab bar background (iOS) - consistent across all screens
      // Using consistent blur effect to prevent color shifts between tabs
      blurEffect={theme.isDark ? 'dark' : 'light'}
      // Background color with high opacity for stable glass effect
      // High opacity (F5 = 96%) prevents content color bleeding and ensures consistent tab colors
      // This matches the actual background color of each theme to maintain visual consistency
      backgroundColor={Platform.select({
        ios: theme.isDark ? '#0F172AF5' : '#FFFFFFF5',
        android: theme.colors.background,
      })}
      // Disable transparent on scroll edge for consistent glass effect
      disableTransparentOnScrollEdge={true}
      // Shadow color for depth - consistent across themes
      shadowColor={Platform.OS === 'ios' ? (theme.isDark ? '#00000066' : '#00000033') : undefined}
    >
      <NativeTabs.Trigger name="index">
        <Icon
          sf={{ default: 'creditcard', selected: 'creditcard.fill' }}
          androidSrc={<VectorIcon family={Ionicons} name="wallet" />}
        />
        <Label>Wallet</Label>
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="send">
        <Icon
          sf={{ default: 'arrow.up.circle', selected: 'arrow.up.circle.fill' }}
          androidSrc={<VectorIcon family={Ionicons} name="arrow-up-circle" />}
        />
        <Label>Send</Label>
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="receive">
        <Icon
          sf={{ default: 'arrow.down.circle', selected: 'arrow.down.circle.fill' }}
          androidSrc={<VectorIcon family={Ionicons} name="arrow-down-circle" />}
        />
        <Label>Receive</Label>
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="settings">
        <Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          androidSrc={<VectorIcon family={Ionicons} name="settings" />}
        />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}