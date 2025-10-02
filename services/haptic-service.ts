import * as Haptics from 'expo-haptics';

export class HapticService {
  // Light haptic for subtle interactions (like button taps)
  static async light() {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.log('Haptics not available:', error);
    }
  }

  // Medium haptic for more significant interactions (like tab changes)
  static async medium() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
  }

  // Heavy haptic for important actions (like successful transactions)
  static async heavy() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
  }

  // Success haptic for positive outcomes
  static async success() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
  }

  // Error haptic for negative outcomes
  static async error() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
  }

  // Warning haptic for cautionary situations
  static async warning() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
  }

  // Custom haptic patterns for specific actions
  static async buttonPress() {
    await this.light();
  }

  static async tabChange() {
    await this.medium();
  }

  static async transactionSuccess() {
    await this.success();
    // Add a small delay then light haptic for extra delight
    setTimeout(() => this.light(), 100);
  }

  static async transactionError() {
    await this.error();
  }

  static async walletCreated() {
    await this.success();
    setTimeout(() => this.medium(), 150);
  }

  static async balanceUpdate() {
    await this.light();
  }

  static async securityAction() {
    await this.medium();
  }
}

export default HapticService;
