import React from 'react';
import { SafeAreaView } from 'react-native';
import { Stack, router } from 'expo-router';
import PinVerificationScreen from '@/components/PinVerificationScreen';
import { useWallet } from '@/hooks/wallet-store';
import { GradientBackground } from '@/components/GradientBackground';

export default function PinVerificationRoute() {
  const { theme } = useWallet();

  const handleSuccess = () => {
    // PIN verified successfully, navigate to wallet setup
    router.push('/wallet-setup');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <SafeAreaView style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <PinVerificationScreen
          title="Add Wallet"
          subtitle="Enter your PIN to add a new wallet"
          onSuccess={handleSuccess}
          onBack={handleBack}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}