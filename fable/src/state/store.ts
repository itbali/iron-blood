import { useSyncExternalStore } from 'react';

/**
 * Minimal external store. The game loop writes, React reads via useSyncExternalStore,
 * so gameplay never triggers a React re-render by itself.
 */
export class Store<T> {
  private listeners = new Set<() => void>();
  private state: T;

  constructor(initial: T) {
    this.state = initial;
  }

  get = (): T => this.state;

  set = (next: T | ((prev: T) => T)): void => {
    const value = typeof next === 'function' ? (next as (prev: T) => T)(this.state) : next;
    if (Object.is(value, this.state)) return;
    this.state = value;
    for (const l of this.listeners) l();
  };

  patch = (partial: Partial<T>): void => {
    this.set({ ...this.state, ...partial });
  };

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
}

export const useStore = <T>(store: Store<T>): T => useSyncExternalStore(store.subscribe, store.get, store.get);

export const useStoreSelector = <T, R>(store: Store<T>, selector: (s: T) => R): R =>
  useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
