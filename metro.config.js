const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Suppress warnings for @noble/hashes crypto.js import
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add resolver configuration to handle @noble/hashes crypto.js warning
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add alias to redirect crypto.js to crypto and Node.js polyfills
config.resolver.alias = {
  '@noble/hashes/crypto.js': '@noble/hashes/crypto',
  'stream': 'stream-browserify',
  'crypto': 'react-native-get-random-values',
  'buffer': '@craftzdog/react-native-buffer',
  'process': 'process/browser',
  'events': 'events',
  'util': 'util',
  'assert': 'assert',
  'url': 'url',
  'querystring': 'querystring-es3',
  'string_decoder': 'string_decoder',
  'inherits': 'inherits',
  'safe-buffer': '@craftzdog/react-native-buffer',
  'web-streams-polyfill/ponyfill/es6': 'web-streams-polyfill/dist/ponyfill.js',
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

module.exports = config;
