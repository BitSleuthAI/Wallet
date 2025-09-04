#!/usr/bin/env node

/**
 * Test script to verify Firebase Crashlytics integration
 * This script can be run to test the Crashlytics setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Firebase Crashlytics Integration...\n');

// Check if package.json has the required dependencies
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('📦 Checking dependencies...');
const requiredDeps = [
  '@react-native-firebase/app',
  '@react-native-firebase/crashlytics'
];

let allDepsInstalled = true;
requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep}: Not found`);
    allDepsInstalled = false;
  }
});

if (!allDepsInstalled) {
  console.log('\n❌ Missing required dependencies. Please run: npm install');
  process.exit(1);
}

// Check if Firebase configuration files exist
const googleServiceIOSPath = path.join(__dirname, '..', 'ios', 'BitSleuthWallet', 'GoogleService-Info.plist');
const googleServiceAndroidPath = path.join(__dirname, '..', 'android', 'app', 'google-services.json');

if (fs.existsSync(googleServiceIOSPath)) {
  console.log('✅ GoogleService-Info.plist found (iOS)');
} else {
  console.log('❌ GoogleService-Info.plist not found (iOS)');
}

if (fs.existsSync(googleServiceAndroidPath)) {
  console.log('✅ google-services.json found (Android)');
} else {
  console.log('❌ google-services.json not found (Android)');
  process.exit(1);
}

// Check if app.json has the Firebase plugins
console.log('\n🔧 Checking app.json configuration...');
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const hasFirebaseAppPlugin = appJson.expo.plugins.some(plugin => 
  Array.isArray(plugin) && plugin[0] === '@react-native-firebase/app'
);

const hasCrashlyticsPlugin = appJson.expo.plugins.some(plugin => 
  plugin === '@react-native-firebase/crashlytics'
);

if (hasFirebaseAppPlugin) {
  console.log('✅ @react-native-firebase/app plugin configured');
} else {
  console.log('❌ @react-native-firebase/app plugin not found');
}

if (hasCrashlyticsPlugin) {
  console.log('✅ @react-native-firebase/crashlytics plugin configured');
} else {
  console.log('❌ @react-native-firebase/crashlytics plugin not found');
}

// Check if crashlytics service exists
const crashlyticsServicePath = path.join(__dirname, '..', 'services', 'crashlytics-service.ts');
if (fs.existsSync(crashlyticsServicePath)) {
  console.log('✅ Crashlytics service file found');
} else {
  console.log('❌ Crashlytics service file not found');
}

console.log('\n🎉 Firebase Crashlytics integration test completed!');
console.log('\n📱 To test the integration:');
console.log('1. Run the app: npm run ios (for iOS) or npm run android (for Android)');
console.log('2. Go to Settings > Crashlytics Testing');
console.log('3. Test the different Crashlytics features');
console.log('4. Check the Firebase Console for crash reports');

console.log('\n🔗 Firebase Console: https://console.firebase.google.com/');
console.log('📊 Crashlytics Dashboard: https://console.firebase.google.com/project/bitsleuth/crashlytics');
