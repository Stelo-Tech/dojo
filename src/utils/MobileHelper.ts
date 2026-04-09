import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

export class MobileHelper {
  /** Initialize mobile-specific features. No-op on web. */
  static async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    // Hide status bar for fullscreen landscape gameplay
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.hide();

    // Handle Android hardware back button
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      }
    });
  }

  /** Returns true when running inside a native Capacitor shell (Android/iOS). */
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /** Returns the current platform: 'android' | 'ios' | 'web'. */
  static getPlatform(): string {
    return Capacitor.getPlatform();
  }
}
