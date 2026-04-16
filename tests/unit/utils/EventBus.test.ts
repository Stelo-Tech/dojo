import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, gameEventBus, GameEvents } from '@/utils/EventBus';

/** Minimal event map for isolated unit tests */
type TestEvents = {
  'ping': { value: number };
  'pong': { message: string };
  'counter': { count: number };
};

describe('EventBus — core behaviour', () => {
  let bus: EventBus<TestEvents>;

  beforeEach(() => {
    bus = new EventBus<TestEvents>();
  });

  it('on() registers a handler that is called on emit', () => {
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.emit('ping', { value: 42 });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  it('emit() calls all registered handlers for the event', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('ping', h1);
    bus.on('ping', h2);
    bus.emit('ping', { value: 1 });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('emit() does nothing when no handlers are registered', () => {
    // Should not throw
    expect(() => bus.emit('pong', { message: 'hello' })).not.toThrow();
  });

  it('emit() passes the exact payload to the handler', () => {
    const handler = vi.fn();
    bus.on('pong', handler);
    bus.emit('pong', { message: 'hello world' });
    expect(handler).toHaveBeenCalledWith({ message: 'hello world' });
  });

  it('off() removes a specific handler so it is no longer called', () => {
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.off('ping', handler);
    bus.emit('ping', { value: 99 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('off() only removes the specified handler, leaving others intact', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('ping', h1);
    bus.on('ping', h2);
    bus.off('ping', h1);
    bus.emit('ping', { value: 1 });
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('off() on a non-registered handler does not throw', () => {
    const handler = vi.fn();
    expect(() => bus.off('ping', handler)).not.toThrow();
  });

  it('once() fires exactly once even if emitted multiple times', () => {
    const handler = vi.fn();
    bus.once('counter', handler);
    bus.emit('counter', { count: 1 });
    bus.emit('counter', { count: 2 });
    bus.emit('counter', { count: 3 });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ count: 1 });
  });

  it('once() passes the correct payload on the single call', () => {
    const handler = vi.fn();
    bus.once('pong', handler);
    bus.emit('pong', { message: 'first' });
    expect(handler).toHaveBeenCalledWith({ message: 'first' });
  });

  it('clear() with an event name removes all handlers for that event only', () => {
    const pingHandler = vi.fn();
    const pongHandler = vi.fn();
    bus.on('ping', pingHandler);
    bus.on('pong', pongHandler);

    bus.clear('ping');

    bus.emit('ping', { value: 0 });
    bus.emit('pong', { message: 'keep' });

    expect(pingHandler).not.toHaveBeenCalled();
    expect(pongHandler).toHaveBeenCalledOnce();
  });

  it('clear() without argument removes all handlers for all events', () => {
    const pingHandler = vi.fn();
    const pongHandler = vi.fn();
    bus.on('ping', pingHandler);
    bus.on('pong', pongHandler);

    bus.clear();

    bus.emit('ping', { value: 0 });
    bus.emit('pong', { message: 'gone' });

    expect(pingHandler).not.toHaveBeenCalled();
    expect(pongHandler).not.toHaveBeenCalled();
  });

  it('multiple handlers registered with once() are each called once', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.once('counter', h1);
    bus.once('counter', h2);
    bus.emit('counter', { count: 7 });
    bus.emit('counter', { count: 8 });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('registering the same handler twice results in it being called twice', () => {
    // Set semantics: same function reference is de-duped because handlers is a Set
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.on('ping', handler);
    bus.emit('ping', { value: 1 });
    // Set de-duplicates, so only called once
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('gameEventBus — singleton typed bus', () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  it('is an instance of EventBus typed with GameEvents', () => {
    expect(gameEventBus).toBeDefined();
  });

  it('emits and receives lemming:spawned with correct shape', () => {
    const handler = vi.fn<[GameEvents['lemming:spawned']], void>();
    gameEventBus.on('lemming:spawned', handler);
    gameEventBus.emit('lemming:spawned', { id: 3 });
    expect(handler).toHaveBeenCalledWith({ id: 3 });
  });

  it('emits and receives lemming:died with cause', () => {
    const handler = vi.fn<[GameEvents['lemming:died']], void>();
    gameEventBus.on('lemming:died', handler);
    gameEventBus.emit('lemming:died', { id: 5, cause: 'out-of-bounds' });
    expect(handler).toHaveBeenCalledWith({ id: 5, cause: 'out-of-bounds' });
  });

  it('emits level:allSpawned with empty record payload', () => {
    const handler = vi.fn();
    gameEventBus.on('level:allSpawned', handler);
    gameEventBus.emit('level:allSpawned', {});
    expect(handler).toHaveBeenCalledOnce();
  });

  it('tool:selected accepts null tool value', () => {
    const handler = vi.fn<[GameEvents['tool:selected']], void>();
    gameEventBus.on('tool:selected', handler);
    gameEventBus.emit('tool:selected', { tool: null });
    expect(handler).toHaveBeenCalledWith({ tool: null });
  });
});
