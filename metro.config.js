const { getDefaultConfig } = require('expo/metro-config');
const nodeLibs = require('node-libs-react-native');

const config = getDefaultConfig(__dirname);

// Suppress warnings for @noble/hashes crypto.js import
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add resolver configuration to handle @noble/hashes crypto.js warning
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add asset resolver configuration for expo-asset
config.resolver.assetExts = [...config.resolver.assetExts, 'bin', 'txt', 'jpg', 'png', 'json', 'gif', 'webp', 'svg'];

// Add extraNodeModules to handle Node.js polyfills using node-libs-react-native
config.resolver.extraNodeModules = {
  ...nodeLibs,
  // Override specific modules with our preferred polyfills
  'stream': require.resolve('stream-browserify'),
  'crypto': require.resolve('react-native-get-random-values'),
  'buffer': require.resolve('@craftzdog/react-native-buffer'),
  'process': require.resolve('process/browser'),
};

// Add alias to redirect crypto.js to crypto and Node.js polyfills
config.resolver.alias = {
  '@noble/hashes/crypto.js': '@noble/hashes/crypto',
  'web-streams-polyfill/ponyfill/es6': 'web-streams-polyfill/dist/ponyfill.js',
  // Fix for Metro source map generation - ensure this module resolves correctly
  '@babel/traverse--for-generate-function-map': require.resolve('@babel/traverse'),
  // Ensure @babel/traverse resolves correctly for metro-config
  '@babel/traverse': require.resolve('@babel/traverse'),
};

// Ensure polyfills are resolved correctly
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs', 'mjs'];

// Add blockList to exclude problematic files
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
];

// Add watchFolders to ensure Metro watches the correct directories
config.watchFolders = [
  __dirname,
  `${__dirname}/node_modules`,
];

// Add custom resolver to handle Node.js modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle Node.js built-in modules that need polyfills
  if (config.resolver.extraNodeModules[moduleName]) {
    try {
      return {
        type: 'sourceFile',
        filePath: config.resolver.extraNodeModules[moduleName],
      };
    } catch (error) {
      console.warn(`Failed to resolve ${moduleName}:`, error.message);
    }
  }
  
  // Handle aliases
  if (config.resolver.alias[moduleName]) {
    try {
      const resolvedPath = require.resolve(config.resolver.alias[moduleName]);
      return {
        type: 'sourceFile',
        filePath: resolvedPath,
      };
    } catch (error) {
      console.warn(`Failed to resolve alias ${moduleName}:`, error.message);
    }
  }
  
  // Fall back to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
