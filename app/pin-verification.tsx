import React from 'react';
import { SafeAreaView, Platform, View } from 'react-native';
import { Stack, router } from 'expo-router';
import PinVerificationScreen from '@/components/PinVerificationScreen';
import { useWallet } from '@/hooks/wallet-store';
import { GradientBackground } from '@/components/GradientBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PinVerificationRoute() {
  const { theme } = useWallet();
  const insets = useSafeAreaInsets();

  const handleSuccess = () => {
    // PIN verified successfully, navigate to wallet setup
    router.push('/wallet-setup');
  };

  const handleBack = () => {
    // Navigate back to manage wallets instead of using router.back()
    router.push('/manage-wallets');
  };

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <SafeAreaView style={{ 
          flex: 1,
          paddingTop: Platform.OS === 'android' ? insets.top + 10 : 0
        }}>
          <Stack.Screen options={{ headerShown: false }} />
          <PinVerificationScreen
            title="Add Wallet"
            subtitle="Enter your PIN to add a new wallet"
            onSuccess={handleSuccess}
            onBack={handleBack}
          />
        </SafeAreaView>
      </View>
    </GradientBackground>
  );
}
