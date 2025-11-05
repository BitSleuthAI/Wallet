package ai.bitsleuth.wallet
import expo.modules.splashscreen.SplashScreenManager

import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import androidx.core.view.WindowCompat

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  companion object {
    // Android 15 (Vanilla Ice Cream) - API Level 35
    // Using numeric value for compatibility with SDK versions that may not have the constant yet
    private const val ANDROID_15_API_LEVEL = 35
  }
  
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
    
    // Configure edge-to-edge display based on Android version
    configureEdgeToEdge()
  }
  
  /**
   * Configure edge-to-edge display with proper system bar handling
   * - Android 15+ (API 35+): Full edge-to-edge with transparent system bars
   * - Android 14 and below: Traditional layout with colored system bars
   */
  private fun configureEdgeToEdge() {
    if (Build.VERSION.SDK_INT >= ANDROID_15_API_LEVEL) { // Android 15+
      // Enable edge-to-edge - app draws behind system bars
      WindowCompat.setDecorFitsSystemWindows(window, false)
      
      // Make system bars transparent for immersive experience
      window.statusBarColor = android.graphics.Color.TRANSPARENT
      window.navigationBarColor = android.graphics.Color.TRANSPARENT
      
      // Configure system bar icon appearance based on current theme
      // Dark theme (night mode) = light icons (false)
      // Light theme = dark icons (true)
      val isDarkTheme = (resources.configuration.uiMode and 
                        Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
      
      val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
      windowInsetsController?.let { controller ->
        // Set light/dark icons based on theme for proper contrast
        // In dark mode, use light icons (false)
        // In light mode, use dark icons (true)
        controller.isAppearanceLightStatusBars = !isDarkTheme
        controller.isAppearanceLightNavigationBars = !isDarkTheme
      }
    } else {
      // For Android 14 and below, keep traditional behavior
      // System bars use colors defined in styles.xml (#0F172A)
      WindowCompat.setDecorFitsSystemWindows(window, true)
    }
  }
  
  /**
   * Handle configuration changes (e.g., theme switching)
   * Update system bar appearance when theme changes
   */
  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    
    // Reconfigure edge-to-edge when theme changes (dark/light mode)
    if (Build.VERSION.SDK_INT >= ANDROID_15_API_LEVEL) {
      configureEdgeToEdge()
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
