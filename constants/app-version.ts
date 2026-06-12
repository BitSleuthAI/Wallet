import Constants from 'expo-constants';

// Single source of truth for the displayed app version, read from app.json.
// Bump expo.version in app.json and every consumer (splash screen, About,
// Settings, Crashlytics) updates automatically.
export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';
