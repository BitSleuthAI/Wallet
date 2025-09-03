import React from 'react';
import { Platform, View } from 'react-native';
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

  if (Platform.OS !== 'android') {
    return <View style={style}>{children}</View>;
  }

  const androidStyles = {
    paddingTop: enableTopPadding ? (customTopPadding ?? Math.max(insets.top + 20, 60)) : 0,
    paddingBottom: enableBottomPadding ? (customBottomPadding ?? Math.max(insets.bottom + 20, 80)) : 0,
  };

  return (
    <View style={[style, androidStyles]}>
      {children}
    </View>
  );
}

