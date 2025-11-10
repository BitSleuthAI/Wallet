# Firebase Crashlytics Build Fixes

## ⚠️ IMPORTANT: Post-Prebuild Steps

When running `npx expo prebuild --clean`, the following files get regenerated and **our custom fixes are lost**. You must reapply these fixes after each prebuild:

---

## iOS Fix (Podfile)

**File**: `ios/Podfile`

**Problem**: React Native Firebase with static frameworks and modular headers causes "non-modular include" errors.

**Solution**: Add custom `post_install` hook to suppress warnings and configure build settings.

Replace the basic `post_install` block:

```ruby
  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
  end
```

With this extended version:

```ruby
  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
    
    # CRITICAL: Allow non-modular includes for React Native Firebase with New Architecture
    # This must be set at the project level, not just per-target
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
    
    # Suppress "Run script build phase will be run during every build" warnings
    installer.pods_project.targets.each do |target|
      target.build_phases.each do |build_phase|
        if build_phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
          build_phase.always_out_of_date = "1"
        end
      end
      
      # Fix header search paths for all targets to properly find React headers
      target.build_configurations.each do |config|
        config.build_settings['HEADER_SEARCH_PATHS'] ||= ['$(inherited)']
        
        # Ensure React Core headers are accessible
        config.build_settings['HEADER_SEARCH_PATHS'] << '"${PODS_CONFIGURATION_BUILD_DIR}/React-Core/React_Core.framework/Headers"'
        config.build_settings['HEADER_SEARCH_PATHS'] << '"${PODS_CONFIGURATION_BUILD_DIR}/React-RCTFabric/RCTFabric.framework/Headers"'
        config.build_settings['HEADER_SEARCH_PATHS'] << '"${PODS_ROOT}/Headers/Public/React-Core"'
      end
    end
    
    # Header paths required for React Native Firebase with New Architecture
    react_native_headers = [
      '"${PODS_ROOT}/Headers/Public/React-Core"',
      '"${PODS_ROOT}/Headers/Public/React-RCTFabric"',
      '"${PODS_ROOT}/Headers/Public/ReactCommon"'
    ]
    
    # Fix for React Native Firebase with New Architecture and static frameworks
    # This ensures proper module definitions and header visibility
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB')
        target.build_configurations.each do |config|
          # Suppress non-modular include warnings
          config.build_settings['OTHER_CFLAGS'] ||= ['$(inherited)']
          config.build_settings['OTHER_CFLAGS'] << '-Wno-non-modular-include-in-framework-module'
          
          # Enable module definitions for proper header imports
          config.build_settings['DEFINES_MODULE'] = 'YES'
          
          # Ensure proper header search paths for React Native headers
          config.build_settings['HEADER_SEARCH_PATHS'] ||= ['$(inherited)']
          config.build_settings['HEADER_SEARCH_PATHS'] += react_native_headers
          
          # Add specific paths for React Native core headers
          config.build_settings['HEADER_SEARCH_PATHS'] << '"${PODS_ROOT}/Headers/Public/React-Codegen/react/renderer/components/rncore"'
          config.build_settings['HEADER_SEARCH_PATHS'] << '"${PODS_CONFIGURATION_BUILD_DIR}/React-Codegen/React_Codegen.framework/Headers"'
          
          # Allow non-modular includes in framework modules for compatibility
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          
          # Disable strict module context checking for Firebase modules
          config.build_settings['CLANG_WARN_STRICT_PROTOTYPES'] = 'NO'
          config.build_settings['GCC_WARN_INHIBIT_ALL_WARNINGS'] = 'YES'
        end
      end
    end
  end
```

**Then run**: `cd ios && pod install && cd ..`

---

## Android Fix (AndroidManifest.xml)

**File**: `android/app/src/main/AndroidManifest.xml`

**Problem**: Manifest merger conflict - Firebase Crashlytics library sets `firebase_crashlytics_collection_enabled` to `false` by default, but we want it `true`.

**Solution**: Add meta-data with `tools:replace` directive.

Add this line inside the `<application>` tag (after the expo.modules meta-data entries):

```xml
<meta-data android:name="firebase_crashlytics_collection_enabled" android:value="true" tools:replace="android:value"/>
```

**Full context** (add the highlighted line):

```xml
<application ...>
    <meta-data android:name="expo.modules.updates.ENABLED" android:value="false"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="ALWAYS"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="0"/>
    <!-- ADD THIS LINE: -->
    <meta-data android:name="firebase_crashlytics_collection_enabled" android:value="true" tools:replace="android:value"/>
    <activity android:name=".MainActivity" ...>
```

---

## Additional Patch (Already Applied via patch-package)

**File**: `patches/@react-native-firebase+crashlytics+23.5.0.patch`

This patch fixes import issues in the RNFBCrashlytics module header files. It's automatically applied during `npm install` via the `postinstall` script.

**Patch contents**: Adds conditional imports for React-Core framework headers with fallback to standard React imports.

---

## Quick Reference Commands

After running `npx expo prebuild --clean`:

```bash
# 1. Apply iOS fix to ios/Podfile (see above)
# 2. Apply Android fix to android/app/src/main/AndroidManifest.xml (see above)

# 3. Reinstall iOS pods
cd ios && pod install && cd ..

# 4. Build
npx expo run:ios    # or
npx expo run:android
```

---

## Error Messages This Fixes

### iOS Errors:
```
include of non-modular header inside framework module 'RNFBApp.RCTConvert_FIRApp'
include of non-modular header inside framework module 'RNFBApp.RNFBAppModule'
declaration of 'RCTBridgeModule' must be imported from module 'RNFBApp.RNFBAppModule'
```

### Android Errors:
```
Manifest merger failed: Attribute meta-data#firebase_crashlytics_collection_enabled@value value=(true)
is also present at [:react-native-firebase_crashlytics] AndroidManifest.xml:12:13-34 value=(false).
Suggestion: add 'tools:replace="android:value"' to <meta-data> element
```

---

## Why This Happens

1. **iOS**: React Native's New Architecture + static frameworks + modular headers + Firebase = build errors due to header import visibility issues
2. **Android**: Firebase Crashlytics library defaults to disabled (`false`) to allow custom initialization, but we want it enabled by default
3. **prebuild --clean**: Expo regenerates `ios/` and `android/` folders from scratch, losing our custom configurations

---

**Last Updated**: 2025-11-10
