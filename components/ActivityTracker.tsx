import React, { useEffect } from 'react';
import { View, PanResponder } from 'react-native';
import { useAutoLock } from '@/hooks/auto-lock-store';

interface ActivityTrackerProps {
  children: React.ReactNode;
}

export default function ActivityTracker({ children }: ActivityTrackerProps) {
  const { updateActivity, isLocked } = useAutoLock();

  // Create a PanResponder to track touch events
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => {
      if (!isLocked) {
        updateActivity();
      }
      return false; // Don't capture the gesture, just track it
    },
    onMoveShouldSetPanResponder: () => {
      if (!isLocked) {
        updateActivity();
      }
      return false; // Don't capture the gesture, just track it
    },
  });

  useEffect(() => {
    // Attach event listeners for web
    if (typeof window !== 'undefined') {
      const handleActivity = () => {
        if (!isLocked) {
          updateActivity();
        }
      };

      // Track various user interactions on web
      const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
      
      events.forEach(event => {
        window.addEventListener(event, handleActivity, { passive: true });
      });

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
      };
    }

    return () => {
      // Cleanup for native (PanResponder cleanup is automatic)
    };
  }, [updateActivity, isLocked]);

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}