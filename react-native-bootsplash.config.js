module.exports = {
  projectRoot: __dirname,
  ios: {
    source: './assets/splash.png',
    backgroundColor: '#0F172A',
    resizeMode: 'contain',
    dark: {
      source: './assets/splash-dark.png',
      backgroundColor: '#0F172A',
    },
  },
  android: {
    source: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F172A',
    dark: {
      source: './assets/splash-dark.png',
      backgroundColor: '#0F172A',
    },
  },
  web: {
    source: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F172A',
  },
};
