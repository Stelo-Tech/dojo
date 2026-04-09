import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorBoundary } from '@/utils/ErrorBoundary';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('install', () => {
    it('registers error and unhandledrejection listeners', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');

      // Force re-install by resetting the static flag
      // We access via indexed signature since `installed` is private
      (ErrorBoundary as unknown as Record<string, boolean>)['installed'] = false;
      ErrorBoundary.install();

      const eventTypes = addSpy.mock.calls.map((call) => call[0]);
      expect(eventTypes).toContain('error');
      expect(eventTypes).toContain('unhandledrejection');

      addSpy.mockRestore();
    });

    it('is idempotent — does not double-register', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');

      (ErrorBoundary as unknown as Record<string, boolean>)['installed'] = false;
      ErrorBoundary.install();
      const firstCallCount = addSpy.mock.calls.length;

      ErrorBoundary.install();
      expect(addSpy.mock.calls.length).toBe(firstCallCount);

      addSpy.mockRestore();
    });
  });

  describe('handleError', () => {
    it('logs the error to console.error', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      // Call private handleError via indexed access
      const handleError = (ErrorBoundary as unknown as Record<string, (e: unknown) => void>)['handleError'];
      if (typeof handleError === 'function') {
        handleError(new Error('test crash'));
        expect(errorSpy).toHaveBeenCalledWith(
          '[ErrorBoundary] Unhandled error:',
          expect.any(Error),
        );
      }

      errorSpy.mockRestore();
    });

    it('does not throw even if console.error fails', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {
        throw new Error('console broken');
      });

      const handleError = (ErrorBoundary as unknown as Record<string, (e: unknown) => void>)['handleError'];
      if (typeof handleError === 'function') {
        expect(() => handleError(new Error('test'))).not.toThrow();
      }

      vi.restoreAllMocks();
    });
  });
});
