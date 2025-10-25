const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable debug logging and better error reporting
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

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
      console.log(`[Metro] ${req.method} ${req.url}`);
      return middleware(req, res, next);
    };
  },
};

// Enable better error handling
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  },
});

// Enable source maps in development
config.transformer.enableBabelRCLookup = false;

module.exports = config;