import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface OptimizedTouchableOpacityProps extends TouchableOpacityProps {
  children: React.ReactNode;
}

/**
 * Shallow equality check for objects
 */
const shallowEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  
  if (!obj1 || !obj2) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
};

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
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    
    // Check if number of props changed (prop added/removed)
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    // Check all props from both objects
    const allKeys = new Set([...prevKeys, ...nextKeys]);
    
    for (const key of allKeys) {
      if (key === 'style') {
        // Deep comparison for style objects
        const prevStyle = prevProps[key];
        const nextStyle = nextProps[key];
        
        // If both are undefined/null, they're equal
        if (!prevStyle && !nextStyle) continue;
        
        // If one is undefined/null and the other isn't, they're different
        if (!prevStyle || !nextStyle) return false;
        
        // If both are arrays, compare each element
        if (Array.isArray(prevStyle) && Array.isArray(nextStyle)) {
          if (prevStyle.length !== nextStyle.length) return false;
          for (let i = 0; i < prevStyle.length; i++) {
            if (!shallowEqual(prevStyle[i], nextStyle[i])) return false;
          }
          continue;
        }
        
        // If both are objects, do shallow comparison
        if (typeof prevStyle === 'object' && typeof nextStyle === 'object') {
          if (!shallowEqual(prevStyle, nextStyle)) return false;
          continue;
        }
        
        // For primitive values, direct comparison
        if (prevStyle !== nextStyle) return false;
        continue;
      }
      
      // For non-style props, direct comparison
      if ((prevProps as any)[key] !== (nextProps as any)[key]) {
        return false; // Props changed, should re-render
      }
    }
    
    return true; // Props are the same, skip re-render
  }
);

OptimizedTouchableOpacity.displayName = 'OptimizedTouchableOpacity';

export default OptimizedTouchableOpacity;
