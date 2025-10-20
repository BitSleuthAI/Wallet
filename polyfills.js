// This file must be imported at the very top of your app
// Import all polyfills first
import 'react-native-get-random-values';
import 'react-native-polyfill-globals/auto';
import 'react-native-url-polyfill/auto';

// Import expo-asset to ensure it's available
import 'expo-asset';

// Ensure global object is properly initialized for React Native
if (typeof global === 'undefined') {
  // Create global object if it doesn't exist
  if (typeof globalThis !== 'undefined') {
    // Use eval to avoid strict mode ReferenceError when assigning to global
    eval('global = globalThis');
  } else if (typeof window !== 'undefined') {
    eval('global = window');
  } else {
    eval('global = {}');
  }
}

// Ensure global is available on globalThis as well
if (typeof globalThis !== 'undefined' && typeof globalThis.global === 'undefined') {
  globalThis.global = global;
}

// Note: react-native-get-random-values is imported at the top for side effects
// It automatically polyfills crypto.getRandomValues, so no manual assignment needed

// Note: react-native-polyfill-globals/auto should handle most Node.js modules
// The custom require function is simplified since the polyfills are handled automatically

console.log('✅ All Node.js polyfills loaded successfully');
console.log('✅ Global object initialized:', typeof global !== 'undefined');
