// This file must be imported at the very top of your app
// Import all polyfills first
import 'react-native-get-random-values';
import 'react-native-polyfill-globals/auto';
import 'react-native-url-polyfill/auto';

// Note: react-native-get-random-values is imported at the top for side effects
// It automatically polyfills crypto.getRandomValues, so no manual assignment needed

// Note: react-native-polyfill-globals/auto should handle most Node.js modules
// The custom require function is simplified since the polyfills are handled automatically

console.log('✅ All Node.js polyfills loaded successfully');
