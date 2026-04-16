/**
 * ErrorBoundary — global crash recovery.
 *
 * Installs window-level error handlers that attempt to save the
 * current game state before the app goes down.  This is a best-effort
 * mechanism: if the save itself fails, there is nothing more to do.
 */
import { SaveSystem } from '@/systems/SaveSystem';

export class ErrorBoundary {
  private static installed = false;

  /** Install global error and unhandled-rejection handlers (idempotent). */
  static install(): void {
    if (ErrorBoundary.installed) return;
    ErrorBoundary.installed = true;

    window.addEventListener('error', (event: ErrorEvent) => {
      ErrorBoundary.handleError(event.error);
    });

    window.addEventListener(
      'unhandledrejection',
      (event: PromiseRejectionEvent) => {
        ErrorBoundary.handleError(event.reason);
      },
    );
  }

  /**
   * Handle an uncaught error: log it and attempt an emergency save.
   * This must never throw — otherwise we enter an infinite error loop.
   */
  private static handleError(error: unknown): void {
    try {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] Unhandled error:', error);
    } catch {
      // console itself failed — nothing we can do
    }

    try {
      const emergencySave = new SaveSystem();
      emergencySave.save();
    } catch {
      // Save failed — best effort exhausted
    }
  }
}
