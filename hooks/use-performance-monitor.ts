import { useCallback, useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
}

/**
 * Hook to monitor component performance and detect unnecessary re-renders
 * Useful for debugging performance issues during development
 */
export const usePerformanceMonitor = (componentName: string, enabled: boolean = __DEV__) => {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    renderCountRef.current += 1;
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      lastRenderTimeRef.current = renderTime;
      renderTimesRef.current.push(renderTime);
      
      // Keep only last 10 render times to calculate average
      if (renderTimesRef.current.length > 10) {
        renderTimesRef.current = renderTimesRef.current.slice(-10);
      }
      
      const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
      
      // Log performance metrics if render time is concerning (>16ms for 60fps)
      if (renderTime > 16) {
        console.warn(`🐌 Slow render detected in ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: renderCountRef.current,
          averageRenderTime: `${averageRenderTime.toFixed(2)}ms`,
        });
      } else if (renderCountRef.current % 10 === 0) {
        // Log every 10th render for monitoring
        console.log(`📊 ${componentName} performance:`, {
          renderCount: renderCountRef.current,
          lastRenderTime: `${renderTime.toFixed(2)}ms`,
          averageRenderTime: `${averageRenderTime.toFixed(2)}ms`,
        });
      }
    };
  });

  const getMetrics = useCallback((): PerformanceMetrics => {
    const averageRenderTime = renderTimesRef.current.length > 0 
      ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length 
      : 0;

    return {
      renderCount: renderCountRef.current,
      lastRenderTime: lastRenderTimeRef.current,
      averageRenderTime,
    };
  }, []);

  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    renderTimesRef.current = [];
    lastRenderTimeRef.current = 0;
  }, []);

  return {
    getMetrics,
    resetMetrics,
    renderCount: renderCountRef.current,
  };
};

/**
 * Higher-order component to wrap components with performance monitoring
 */
export const withPerformanceMonitor = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string = Component.displayName || Component.name || 'Unknown'
) => {
  const WrappedComponent = React.memo((props: P) => {
    usePerformanceMonitor(componentName);
    return <Component {...props} />;
  });

  WrappedComponent.displayName = `withPerformanceMonitor(${componentName})`;
  return WrappedComponent;
};
