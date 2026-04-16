import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Analytics } from '@/utils/Analytics';
import { ANALYTICS_CONSENT_KEY } from '@/systems/SaveTypes';

describe('Analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    Analytics.setEnabled(false);
  });

  afterEach(() => {
    localStorage.clear();
  });

  // -------------------------------------------------------------------------
  // init
  // -------------------------------------------------------------------------

  describe('init', () => {
    it('is disabled by default when no consent is stored', () => {
      Analytics.init();
      expect(Analytics.isEnabled()).toBe(false);
    });

    it('reads consent from localStorage when set to true', () => {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, 'true');
      Analytics.init();
      expect(Analytics.isEnabled()).toBe(true);
    });

    it('stays disabled when localStorage consent is anything other than "true"', () => {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, 'false');
      Analytics.init();
      expect(Analytics.isEnabled()).toBe(false);
    });

    it('stays disabled when localStorage throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      Analytics.init();
      expect(Analytics.isEnabled()).toBe(false);

      spy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // setEnabled
  // -------------------------------------------------------------------------

  describe('setEnabled', () => {
    it('enables analytics and persists to localStorage', () => {
      Analytics.setEnabled(true);
      expect(Analytics.isEnabled()).toBe(true);
      expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('true');
    });

    it('disables analytics and persists to localStorage', () => {
      Analytics.setEnabled(true);
      Analytics.setEnabled(false);
      expect(Analytics.isEnabled()).toBe(false);
      expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('false');
    });

    it('does not throw when localStorage is unavailable', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => Analytics.setEnabled(true)).not.toThrow();
      expect(Analytics.isEnabled()).toBe(true);

      spy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // track
  // -------------------------------------------------------------------------

  describe('track', () => {
    it('does not log when analytics are disabled', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

      Analytics.setEnabled(false);
      Analytics.track('test_event', { key: 'value' });

      expect(debugSpy).not.toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    it('is a no-op when disabled (no crash, no side effects)', () => {
      Analytics.setEnabled(false);
      expect(() => Analytics.track('event')).not.toThrow();
      expect(() => Analytics.track('event', { x: 1 })).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Convenience methods
  // -------------------------------------------------------------------------

  describe('convenience tracking methods', () => {
    it('trackLevelStart calls track with correct event name', () => {
      const trackSpy = vi.spyOn(Analytics, 'track');
      Analytics.trackLevelStart(5);

      expect(trackSpy).toHaveBeenCalledWith('level_start', { levelId: 5 });
      trackSpy.mockRestore();
    });

    it('trackLevelComplete includes ratio', () => {
      const trackSpy = vi.spyOn(Analytics, 'track');
      Analytics.trackLevelComplete(3, 8, 10, 25000);

      expect(trackSpy).toHaveBeenCalledWith('level_complete', {
        levelId: 3,
        saved: 8,
        total: 10,
        time: 25000,
        ratio: 0.8,
      });
      trackSpy.mockRestore();
    });

    it('trackLevelComplete handles total of 0 without dividing by zero', () => {
      const trackSpy = vi.spyOn(Analytics, 'track');
      Analytics.trackLevelComplete(1, 0, 0, 10000);

      expect(trackSpy).toHaveBeenCalledWith('level_complete', {
        levelId: 1,
        saved: 0,
        total: 0,
        time: 10000,
        ratio: 0,
      });
      trackSpy.mockRestore();
    });

    it('trackLevelFail calls track with correct event name', () => {
      const trackSpy = vi.spyOn(Analytics, 'track');
      Analytics.trackLevelFail(2, 1, 10);

      expect(trackSpy).toHaveBeenCalledWith('level_fail', {
        levelId: 2,
        saved: 1,
        total: 10,
      });
      trackSpy.mockRestore();
    });
  });
});
