/**
 * Vitest global setup — mocks Phaser globals and canvas APIs
 * that are unavailable in jsdom (no WebGL, no AudioContext).
 */

// Mock HTMLCanvasElement.getContext so Phaser does not crash during import
// in a jsdom environment where WebGL is not available.
HTMLCanvasElement.prototype.getContext = function (
  contextId: string,
): RenderingContext | null {
  if (contextId === '2d') {
    // Minimal CanvasRenderingContext2D stub
    return {
      clearRect: () => undefined,
      fillRect: () => undefined,
      drawImage: () => undefined,
      save: () => undefined,
      restore: () => undefined,
      scale: () => undefined,
      rotate: () => undefined,
      translate: () => undefined,
      setTransform: () => undefined,
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => undefined,
      getImageData: () => ({ data: new Uint8ClampedArray(4), width: 0, height: 0 }),
      measureText: () => ({ width: 0 }),
      fillText: () => undefined,
      strokeText: () => undefined,
      beginPath: () => undefined,
      closePath: () => undefined,
      moveTo: () => undefined,
      lineTo: () => undefined,
      stroke: () => undefined,
      fill: () => undefined,
      arc: () => undefined,
      rect: () => undefined,
      clip: () => undefined,
      canvas: this as HTMLCanvasElement,
    } as unknown as CanvasRenderingContext2D;
  }
  // WebGL not supported in jsdom — return null, Phaser will fall back to Canvas
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;

// Mock Web Audio API (AudioContext) — unavailable in jsdom
class MockAudioContext {
  createGain() {
    return { connect: () => undefined, gain: { value: 1 } };
  }
  createBufferSource() {
    return {
      connect: () => undefined,
      start: () => undefined,
      stop: () => undefined,
      buffer: null,
    };
  }
  decodeAudioData(_: ArrayBuffer): Promise<AudioBuffer> {
    return Promise.resolve({} as AudioBuffer);
  }
  get destination() {
    return {} as AudioDestinationNode;
  }
}

// Assign to window so Phaser's audio system can find it
(globalThis as Record<string, unknown>).AudioContext = MockAudioContext;
(globalThis as Record<string, unknown>).webkitAudioContext = MockAudioContext;

// Mock requestAnimationFrame — jsdom does not implement it
globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  setTimeout(() => cb(performance.now()), 16);
  return 0;
};
globalThis.cancelAnimationFrame = (_handle: number): void => undefined;

// Mock URL.createObjectURL used by some asset loaders
(URL as { createObjectURL?: unknown }).createObjectURL = () => 'blob:mock';
(URL as { revokeObjectURL?: unknown }).revokeObjectURL = () => undefined;
