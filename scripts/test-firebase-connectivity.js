#!/usr/bin/env node

/**
 * Test script to verify Firebase connectivity and configuration
 * This script helps debug Firebase Crashlytics issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Testing Firebase Connectivity and Configuration...\n');

// Check Firebase project configuration
console.log('📋 Checking Firebase Project Configuration...');

const googleServiceIOSPath = path.join(__dirname, '..', 'ios', 'BitSleuthWallet', 'GoogleService-Info.plist');
const googleServiceAndroidPath = path.join(__dirname, '..', 'android', 'app', 'google-services.json');

let iosConfig = null;
let androidConfig = null;

// Parse iOS configuration
if (fs.existsSync(googleServiceIOSPath)) {
  console.log('✅ GoogleService-Info.plist found (iOS)');
  try {
    const plistContent = fs.readFileSync(googleServiceIOSPath, 'utf8');
    const projectIdMatch = plistContent.match(/<key>PROJECT_ID<\/key>\s*<string>([^<]+)<\/string>/);
    const bundleIdMatch = plistContent.match(/<key>BUNDLE_ID<\/key>\s*<string>([^<]+)<\/string>/);
    
    if (projectIdMatch && bundleIdMatch) {
      iosConfig = {
        projectId: projectIdMatch[1],
        bundleId: bundleIdMatch[1]
      };
      console.log(`   📱 Project ID: ${iosConfig.projectId}`);
      console.log(`   📱 Bundle ID: ${iosConfig.bundleId}`);
    }
  } catch (error) {
    console.log('❌ Error parsing iOS configuration:', error.message);
  }
} else {
  console.log('❌ GoogleService-Info.plist not found (iOS)');
}

// Parse Android configuration
if (fs.existsSync(googleServiceAndroidPath)) {
  console.log('✅ google-services.json found (Android)');
  try {
    const androidConfigContent = JSON.parse(fs.readFileSync(googleServiceAndroidPath, 'utf8'));
    const client = androidConfigContent.client[0];
    
    androidConfig = {
      projectId: androidConfigContent.project_info.project_id,
      packageName: client.android_client_info.package_name,
      appId: client.client_info.mobilesdk_app_id
    };
    console.log(`   🤖 Project ID: ${androidConfig.projectId}`);
    console.log(`   🤖 Package Name: ${androidConfig.packageName}`);
    console.log(`   🤖 App ID: ${androidConfig.appId}`);
  } catch (error) {
    console.log('❌ Error parsing Android configuration:', error.message);
  }
} else {
  console.log('❌ google-services.json not found (Android)');
}

// Check Info.plist for Firebase Crashlytics settings
console.log('\n🔧 Checking iOS Firebase Configuration...');
const infoPlistPath = path.join(__dirname, '..', 'ios', 'BitSleuthWallet', 'Info.plist');

if (fs.existsSync(infoPlistPath)) {
  const plistContent = fs.readFileSync(infoPlistPath, 'utf8');
  
  if (plistContent.includes('FirebaseCrashlyticsCollectionEnabled')) {
    console.log('✅ FirebaseCrashlyticsCollectionEnabled found in Info.plist');
    const enabledMatch = plistContent.match(/<key>FirebaseCrashlyticsCollectionEnabled<\/key>\s*<true\/>/);
    if (enabledMatch) {
      console.log('✅ Firebase Crashlytics collection is ENABLED');
    } else {
      console.log('❌ Firebase Crashlytics collection is DISABLED');
    }
  } else {
    console.log('❌ FirebaseCrashlyticsCollectionEnabled NOT found in Info.plist');
  }
} else {
  console.log('❌ Info.plist not found');
}

// Check AndroidManifest.xml for Firebase settings
console.log('\n🔧 Checking Android Firebase Configuration...');
const androidManifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (fs.existsSync(androidManifestPath)) {
  const manifestContent = fs.readFileSync(androidManifestPath, 'utf8');
  
  if (manifestContent.includes('firebase_crashlytics_collection_enabled')) {
    console.log('✅ firebase_crashlytics_collection_enabled found in AndroidManifest.xml');
    const enabledMatch = manifestContent.match(/android:name="firebase_crashlytics_collection_enabled"\s*android:value="true"/);
    if (enabledMatch) {
      console.log('✅ Firebase Crashlytics collection is ENABLED');
    } else {
      console.log('❌ Firebase Crashlytics collection is DISABLED');
    }
  } else {
    console.log('❌ firebase_crashlytics_collection_enabled NOT found in AndroidManifest.xml');
  }
} else {
  console.log('❌ AndroidManifest.xml not found');
}

// Check package.json dependencies
console.log('\n📦 Checking Firebase Dependencies...');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const firebaseDeps = [
  '@react-native-firebase/app',
  '@react-native-firebase/crashlytics'
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
    } else {
      console.log('❌ Invalid app.json structure - missing expo.plugins array');
    }
  } catch (error) {
    console.log('❌ Error parsing app.json:', error.message);
  }
} else {
  console.log('❌ app.json not found');
}

// Summary and recommendations
console.log('\n🎯 Summary and Recommendations:');
console.log('=====================================');

if (iosConfig && androidConfig) {
  if (iosConfig.projectId === androidConfig.projectId) {
    console.log('✅ iOS and Android are using the same Firebase project');
  } else {
    console.log('❌ iOS and Android are using different Firebase projects');
  }
}

console.log('\n📱 Next Steps:');
console.log('1. Rebuild your app after these configuration changes');
console.log('2. Test Firebase Crashlytics using the test buttons in your app');
console.log('3. Check Firebase Console for crash reports');
console.log('4. Ensure you\'re testing with a release build (not debug)');

console.log('\n🔗 Firebase Console Links:');
if (iosConfig) {
  console.log(`📊 iOS Crashlytics: https://console.firebase.google.com/project/${iosConfig.projectId}/crashlytics`);
}
if (androidConfig) {
  console.log(`📊 Android Crashlytics: https://console.firebase.google.com/project/${androidConfig.projectId}/crashlytics`);
}

console.log('\n🧪 Testing Commands:');
console.log('iOS: npx expo run:ios');
console.log('Android: npx expo run:android');
console.log('Production Build: eas build --platform all --profile production');

console.log('\n✨ Firebase connectivity test completed!');
