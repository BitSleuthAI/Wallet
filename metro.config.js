const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure supported platforms for module resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Polyfill Node.js modules for React Native
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('@craftzdog/react-native-buffer'),
  stream: require.resolve('stream-browserify'),
};

// Enable source maps for better debugging
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Enable better debugging and error reporting
config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Metro] ${req.method} ${req.url}`);
      }
      return middleware(req, res, next);
    };
  },
};

// Configure Metro transformer options for imports and inline requires
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  },
});

// Enable source maps in development
config.transformer.enableBabelRCLookup = false;

module.exports = config;