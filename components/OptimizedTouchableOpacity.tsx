import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface OptimizedTouchableOpacityProps extends TouchableOpacityProps {
  children: React.ReactNode;
}

/**
 * Optimized TouchableOpacity that prevents unnecessary re-renders
 * by memoizing the component and only re-rendering when props actually change
 */
const OptimizedTouchableOpacity = React.memo<OptimizedTouchableOpacityProps>(
  ({ children, ...props }) => {
    return <TouchableOpacity {...props}>{children}</TouchableOpacity>;
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent re-renders when only style objects change
    // but their content is the same
    const keys = Object.keys(nextProps);
    
    for (const key of keys) {
      if (key === 'style') {
        // Skip style comparison as it's often a new object reference
        continue;
      }
      if (prevProps[key] !== nextProps[key]) {
        return false; // Props changed, should re-render
      }
    }
    
    return true; // Props are the same, skip re-render
  }
);

OptimizedTouchableOpacity.displayName = 'OptimizedTouchableOpacity';

export default OptimizedTouchableOpacity;
