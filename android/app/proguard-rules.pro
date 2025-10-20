# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Keep native crypto libraries to prevent SIGABRT crashes
-keep class ai.bitsleuth.wallet.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep biometric and crypto related classes
-keep class com.rnbiometrics.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# Prevent obfuscation of native method names
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep JNI methods
-keepclasseswithmembers class * {
    native <methods>;
}

# Keep native libraries
-keep class * extends com.facebook.react.bridge.ReactPackage
-keep class * extends com.facebook.react.bridge.NativeModule

# Memory safety rules
-dontwarn com.facebook.react.**
-dontwarn com.facebook.jni.**
-dontwarn com.facebook.soloader.**
