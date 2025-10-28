import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import { useWallet } from '@/hooks/wallet-store';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { theme } = useWallet();

  return (
    <NativeTabs
      // Tint color for active tabs
      tintColor={theme.colors.primary}
      // Icon colors for default and selected states
      iconColor={{
        default: theme.colors.textSecondary,
        selected: theme.colors.primary,
      }}
      // Label styling for default and selected states
      labelStyle={{
        default: {
          fontSize: 11,
          fontWeight: '600',
          color: theme.colors.textSecondary,
        },
        selected: {
          fontSize: 11,
          fontWeight: '600',
          color: theme.colors.primary,
        },
      }}
      // iOS 26+ liquid glass tab bar with minimize behavior
      minimizeBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
      // Blur effect for tab bar background (iOS)
      blurEffect="systemMaterial"
      // Background color with transparency for glass effect
      backgroundColor={Platform.select({
        ios: theme.isDark ? '#00000066' : '#FFFFFF66',
        android: theme.colors.background,
      })}
      // Disable transparent on scroll edge for consistent appearance
      disableTransparentOnScrollEdge={false}
      // Shadow color for depth
      shadowColor={Platform.OS === 'ios' ? '#00000033' : undefined}
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
          androidSrc={<VectorIcon family={Ionicons} name="send" />}
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