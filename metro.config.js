const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Suppress warnings for @noble/hashes crypto.js import
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add resolver configuration to handle @noble/hashes crypto.js warning
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add alias to redirect crypto.js to crypto
config.resolver.alias = {
  '@noble/hashes/crypto.js': '@noble/hashes/crypto',
};

module.exports = config;
