import { Platform } from 'react-native';

/**
 * Check if the device is running iOS 26 or higher
 * @returns {boolean} True if iOS 26+, false otherwise
 */
export function isIOS26OrHigher(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  
  // Get iOS version
  const version = Platform.Version;
  
  // Platform.Version on iOS returns a string like "26.0" or a number
  const majorVersion = typeof version === 'string' 
    ? parseInt(version.split('.')[0], 10) 
    : version;
  
  return majorVersion >= 26;
}

/**
 * Check if the device is running iOS
 * @returns {boolean} True if iOS, false otherwise
 */
export function isIOS(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Get the appropriate blur tint based on iOS version and theme
 * For iOS 26+, use the new system materials for liquid glass effect
 * @param isDark - Whether dark mode is enabled
 * @returns {string} The blur tint to use
 */
export function getLiquidGlassTint(isDark: boolean): string {
  if (isIOS26OrHigher()) {
    // Use the new iOS 26 system materials for liquid glass effect
    return isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';
  }
  
  // Fallback to standard blur for iOS < 26
  return isDark ? 'dark' : 'light';
}

/**
 * Get the appropriate ultra-thin material blur tint based on iOS version and theme
 * @param isDark - Whether dark mode is enabled
 * @returns {string} The blur tint to use
 */
export function getUltraThinMaterialTint(isDark: boolean): string {
  if (isIOS26OrHigher()) {
    return isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight';
  }
  
  return isDark ? 'dark' : 'extraLight';
}

/**
 * Get the appropriate thin material blur tint based on iOS version and theme
 * @param isDark - Whether dark mode is enabled
 * @returns {string} The blur tint to use
 */
export function getThinMaterialTint(isDark: boolean): string {
  if (isIOS26OrHigher()) {
    return isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight';
  }
  
  return isDark ? 'dark' : 'light';
}
