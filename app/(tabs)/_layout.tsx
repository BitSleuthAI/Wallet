import { darkTheme, lightTheme } from '@/constants/themes';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React, { useEffect, useState } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

export default function TabLayout() {
  // Use color scheme detection directly since we're outside WalletProvider context
  const colorScheme = useColorScheme();
  const [themeKey, setThemeKey] = useState(0);
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // Force re-render when appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      // Increment key to force NativeTabs remount with new theme
      setThemeKey(prev => prev + 1);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NativeTabs
      key={themeKey}
      // Tint color for active tabs
      tintColor={theme.colors.primary}
      // Icon colors for default and selected states
      iconColor={{
        default: theme.colors.textSecondary,
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
      // Blur effect for tab bar background (iOS) - adapts to theme
      blurEffect={theme.isDark ? 'dark' : 'light'}
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