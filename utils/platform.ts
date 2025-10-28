import { Platform } from 'react-native';

/**
 * Check if the device is running iOS 18 or higher
 * @returns {boolean} True if iOS 18+, false otherwise
 */
export function isIOS18OrHigher(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  
  // Get iOS version
  const version = Platform.Version;
  
  // Platform.Version on iOS returns a string like "18.0" or a number
  const majorVersion = typeof version === 'string' 
    ? parseInt(version.split('.')[0], 10) 
    : version;
  
  return majorVersion >= 18;
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
 * For iOS 18+, use the new system materials for liquid glass effect
 * @param isDark - Whether dark mode is enabled
 * @returns {string} The blur tint to use
 */
export function getLiquidGlassTint(isDark: boolean): string {
  if (isIOS18OrHigher()) {
    // Use the new iOS 18 system materials for liquid glass effect
    return isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';
  }
  
  // Fallback to standard blur for iOS < 18
  return isDark ? 'dark' : 'light';
}

/**
 * Get the appropriate ultra-thin material blur tint based on iOS version and theme
 * @param isDark - Whether dark mode is enabled
 * @returns {string} The blur tint to use
 */
export function getUltraThinMaterialTint(isDark: boolean): string {
  if (isIOS18OrHigher()) {
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
  if (isIOS18OrHigher()) {
    return isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight';
  }
  
  return isDark ? 'dark' : 'light';
}
