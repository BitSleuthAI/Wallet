import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AndroidSafeContainerProps {
  children: React.ReactNode;
  style?: any;
  enableTopPadding?: boolean;
  enableBottomPadding?: boolean;
  customTopPadding?: number;
  customBottomPadding?: number;
}

export function AndroidSafeContainer({
  children,
  style,
  enableTopPadding = true,
  enableBottomPadding = true,
  customTopPadding,
  customBottomPadding,
}: AndroidSafeContainerProps) {
  const insets = useSafeAreaInsets();

  // Use safe area insets for both iOS and Android
  const safeStyles = {
    paddingTop: enableTopPadding ? (customTopPadding ?? insets.top) : 0,
    paddingBottom: enableBottomPadding ? (customBottomPadding ?? insets.bottom) : 0,
  };

  return (
    <View style={[style, safeStyles]}>
      {children}
    </View>
  );
}

