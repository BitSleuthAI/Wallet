import { useWallet } from '@/hooks/wallet-store';
import { Tabs } from 'expo-router';
import { Download, Send, Settings, Wallet } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Animated icon wrapper with scale animation
const AnimatedTabIcon = ({ 
  IconComponent, 
  focused, 
  color, 
  size = 24 
}: { 
  IconComponent: any; 
  focused: boolean; 
  color: string; 
  size?: number;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          scale: withSpring(focused ? 1.15 : 1, {
            damping: 15,
            stiffness: 200,
          })
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.iconContainer, animatedStyle]}>
      {focused && (
        <View style={[styles.iconBackground, { backgroundColor: color + '15' }]} />
      )}
      <IconComponent 
        color={color} 
        size={size} 
        fill={focused ? color : 'none'} 
        strokeWidth={focused ? 2.5 : 2}
      />
    </Animated.View>
  );
};

export default function TabLayout() {
  const { theme } = useWallet();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 64 + insets.bottom,
          paddingTop: Platform.OS === 'ios' ? 8 : 4,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8 + insets.bottom,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon IconComponent={Wallet} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: 'Send',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon IconComponent={Send} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: 'Receive',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon IconComponent={Download} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon IconComponent={Settings} focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  iconBackground: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});