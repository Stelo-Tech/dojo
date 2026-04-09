/**
 * Mobile-specific helpers for Capacitor native platforms.
 * Currently a stub — Capacitor integration will be activated
 * when native builds are configured.
 */
export class MobileHelper {
  /** Initialize mobile-specific features. No-op until Capacitor is set up. */
  static async init(): Promise<void> {
    // Will be implemented when Capacitor is fully integrated
  }

  /** Returns true when running inside a native Capacitor shell. */
  static isNative(): boolean {
    return false;
  }

  /** Returns the current platform. */
  static getPlatform(): string {
    return 'web';
  }
}
