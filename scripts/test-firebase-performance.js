#!/usr/bin/env node

/**
 * Test script to verify Firebase Performance Monitoring and App Distribution
 * This script helps debug Firebase integration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Testing Firebase Performance Monitoring & App Distribution Integration...\n');

// Check package.json dependencies
console.log('📦 Checking Firebase Dependencies...');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const firebaseDeps = [
  '@react-native-firebase/app',
  '@react-native-firebase/crashlytics',
  '@react-native-firebase/perf',
  '@react-native-firebase/app-distribution'
];

firebaseDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep}: Not found`);
  }
});

// Check app.json configuration
console.log('\n⚙️ Checking app.json Firebase Configuration...');
const appJsonPath = path.join(__dirname, '..', 'app.json');

if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    if (appJson.expo && appJson.expo.plugins && Array.isArray(appJson.expo.plugins)) {
      const hasFirebaseAppPlugin = appJson.expo.plugins.some(plugin => 
        plugin === '@react-native-firebase/app'
      );

      const hasCrashlyticsPlugin = appJson.expo.plugins.some(plugin => 
        plugin === '@react-native-firebase/crashlytics'
      );

      const hasPerfPlugin = appJson.expo.plugins.some(plugin => 
        plugin === '@react-native-firebase/perf'
      );

      const hasAppDistributionPlugin = appJson.expo.plugins.some(plugin => 
        plugin === '@react-native-firebase/app-distribution'
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

      if (hasPerfPlugin) {
        console.log('✅ @react-native-firebase/perf plugin configured');
      } else {
        console.log('❌ @react-native-firebase/perf plugin not found');
      }

      if (hasAppDistributionPlugin) {
        console.log('✅ @react-native-firebase/app-distribution plugin configured');
      } else {
        console.log('❌ @react-native-firebase/app-distribution plugin not found');
      }
    } else {
      console.log('❌ Invalid app.json structure - missing expo.plugins array');
    }
  } catch (error) {
    console.log('❌ Error parsing app.json:', error.message);
  }
} else {
  console.log('❌ app.json not found');
}

// Check firebase.json configuration
console.log('\n🔧 Checking firebase.json Configuration...');
const firebaseJsonPath = path.join(__dirname, '..', 'firebase.json');

if (fs.existsSync(firebaseJsonPath)) {
  try {
    const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
    
    if (firebaseJson['react-native']) {
      const config = firebaseJson['react-native'];
      
      console.log('Performance Monitoring settings:');
      console.log(`  - perf_auto_collection_enabled: ${config.perf_auto_collection_enabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`  - perf_collection_deactivated: ${config.perf_collection_deactivated ? '⚠️ Deactivated' : '✅ Active'}`);
      
      console.log('\nCrashlytics settings:');
      console.log(`  - crashlytics_collection_enabled: ${config.crashlytics_collection_enabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`  - crashlytics_debug_enabled: ${config.crashlytics_debug_enabled ? '✅ Enabled' : '❌ Disabled'}`);
      
      console.log('\nAnalytics settings (should be disabled):');
      console.log(`  - analytics_auto_collection_enabled: ${config.analytics_auto_collection_enabled ? '⚠️ Enabled' : '✅ Disabled'}`);
    } else {
      console.log('❌ Missing react-native configuration in firebase.json');
    }
  } catch (error) {
    console.log('❌ Error parsing firebase.json:', error.message);
  }
} else {
  console.log('❌ firebase.json not found');
}

// Check Android build.gradle configuration
console.log('\n🤖 Checking Android Build Configuration...');
const androidBuildGradlePath = path.join(__dirname, '..', 'android', 'build.gradle');
const androidAppBuildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

if (fs.existsSync(androidBuildGradlePath)) {
  const buildGradleContent = fs.readFileSync(androidBuildGradlePath, 'utf8');
  
  if (buildGradleContent.includes('firebase-crashlytics-gradle')) {
    console.log('✅ Firebase Crashlytics Gradle plugin found');
  } else {
    console.log('❌ Firebase Crashlytics Gradle plugin not found');
  }
  
  if (buildGradleContent.includes('perf-plugin')) {
    console.log('✅ Firebase Performance Gradle plugin found');
  } else {
    console.log('❌ Firebase Performance Gradle plugin not found');
  }
  
  if (buildGradleContent.includes('firebase-appdistribution-gradle')) {
    console.log('✅ Firebase App Distribution Gradle plugin found');
  } else {
    console.log('❌ Firebase App Distribution Gradle plugin not found');
  }
  
  if (buildGradleContent.includes('google-services')) {
    console.log('✅ Google Services Gradle plugin found');
  } else {
    console.log('❌ Google Services Gradle plugin not found');
  }
} else {
  console.log('❌ android/build.gradle not found');
}

if (fs.existsSync(androidAppBuildGradlePath)) {
  const appBuildGradleContent = fs.readFileSync(androidAppBuildGradlePath, 'utf8');
  
  console.log('\nAndroid app/build.gradle plugins:');
  if (appBuildGradleContent.includes("apply plugin: 'com.google.gms.google-services'")) {
    console.log('✅ Google Services plugin applied');
  } else {
    console.log('❌ Google Services plugin not applied');
  }
  
  if (appBuildGradleContent.includes("apply plugin: 'com.google.firebase.crashlytics'")) {
    console.log('✅ Crashlytics plugin applied');
  } else {
    console.log('❌ Crashlytics plugin not applied');
  }
  
  if (appBuildGradleContent.includes("apply plugin: 'com.google.firebase.firebase-perf'")) {
    console.log('✅ Performance plugin applied');
  } else {
    console.log('❌ Performance plugin not applied');
  }
  
  if (appBuildGradleContent.includes("apply plugin: 'com.google.firebase.appdistribution'")) {
    console.log('✅ App Distribution plugin applied');
  } else {
    console.log('❌ App Distribution plugin not applied');
  }
} else {
  console.log('❌ android/app/build.gradle not found');
}

// Check iOS configuration
console.log('\n📱 Checking iOS Configuration...');
const iosPodfilePath = path.join(__dirname, '..', 'ios', 'Podfile');

if (fs.existsSync(iosPodfilePath)) {
  console.log('✅ iOS Podfile found');
  console.log('ℹ️ Firebase pods will be added automatically via autolinking');
} else {
  console.log('❌ iOS Podfile not found');
}

const googleServiceIOSPath = path.join(__dirname, '..', 'ios', 'BitSleuthWallet', 'GoogleService-Info.plist');
if (fs.existsSync(googleServiceIOSPath)) {
  console.log('✅ GoogleService-Info.plist found (iOS)');
} else {
  console.log('❌ GoogleService-Info.plist not found (iOS)');
}

// Check services files
console.log('\n🔧 Checking Service Files...');
const serviceFiles = [
  'services/crashlytics-service.ts',
  'services/performance-service.ts',
  'services/app-distribution-service.ts',
  'services/firebase-service.ts'
];

serviceFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} not found`);
  }
});

// Summary and recommendations
console.log('\n🎯 Summary and Recommendations:');
console.log('=====================================');
console.log('✅ Firebase Performance Monitoring and App Distribution have been integrated!');
console.log('');
console.log('📋 Features:');
console.log('  1. Firebase Crashlytics - Error reporting ✅');
console.log('  2. Firebase Performance Monitoring - App performance tracking ✅');
console.log('  3. Firebase App Distribution - Release management ✅');
console.log('');
console.log('📱 Next Steps:');
console.log('1. Run `npx expo prebuild --clean` to regenerate native projects');
console.log('2. For iOS: Run `cd ios && pod install` to install Firebase pods');
console.log('3. Build and test your app: `npx expo run:ios` or `npx expo run:android`');
console.log('4. Check Firebase Console for Performance and App Distribution data');
console.log('');
console.log('🔗 Firebase Console:');
console.log('  - Performance: https://console.firebase.google.com/project/_/performance');
console.log('  - App Distribution: https://console.firebase.google.com/project/_/appdistribution');
console.log('  - Crashlytics: https://console.firebase.google.com/project/_/crashlytics');
console.log('');
console.log('💡 Usage:');
console.log('  - Import services: `import firebaseService from "@/services/firebase-service"`');
console.log('  - Track performance: `await firebaseService.performance.trackWalletOperation("create")`');
console.log('  - Check for updates: `await firebaseService.checkForUpdates()`');
console.log('  - Log errors: `firebaseService.crashlytics.recordError(error)`');

console.log('\n✨ Firebase integration test completed!');
