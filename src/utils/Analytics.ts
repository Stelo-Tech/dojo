/**
 * Analytics — lightweight wrapper for event tracking.
 *
 * Currently a placeholder that will connect to Posthog later.
 * Analytics are **disabled by default** and require explicit user consent
 * before any data is collected, per the project's honesty rules.
 *
 * In DEV mode, enabled events are logged to console.debug for visibility.
 */
import { ANALYTICS_CONSENT_KEY } from '@/systems/SaveTypes';

export class Analytics {
  private static enabled = false;

  /**
   * Initialize analytics.
   * Reads persisted consent preference from localStorage.
   * Does NOT enable tracking unless user previously consented.
   */
  static init(): void {
    try {
      const consent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
      Analytics.enabled = consent === 'true';
    } catch {
      Analytics.enabled = false;
    }
  }

  /**
   * Track a named event with optional properties.
   * No-op when analytics are disabled.
   */
  static track(event: string, properties?: Record<string, unknown>): void {
    if (!Analytics.enabled) return;

    // Placeholder — will connect to Posthog when ready.
    // In dev mode, surface events in the console for debugging.
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[Analytics]', event, properties);
    }
  }

  /** Track the start of a level. */
  static trackLevelStart(levelId: number): void {
    Analytics.track('level_start', { levelId });
  }

  /** Track successful level completion. */
  static trackLevelComplete(
    levelId: number,
    saved: number,
    total: number,
    time: number,
  ): void {
    const ratio = total > 0 ? saved / total : 0;
    Analytics.track('level_complete', { levelId, saved, total, time, ratio });
  }

  /** Track a failed level attempt. */
  static trackLevelFail(
    levelId: number,
    saved: number,
    total: number,
  ): void {
    Analytics.track('level_fail', { levelId, saved, total });
  }

  /**
   * Enable or disable analytics (user consent toggle).
   * Persists the preference to localStorage so it survives sessions.
   */
  static setEnabled(value: boolean): void {
    Analytics.enabled = value;
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, String(value));
    } catch {
      // Storage unavailable — consent stays in-memory only
    }
  }

  /** Check whether analytics are currently enabled. */
  static isEnabled(): boolean {
    return Analytics.enabled;
  }
}
