import '@testing-library/jest-dom/vitest';

// jsdom does not implement ResizeObserver — polyfill for chart components
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as Record<string, unknown>).ResizeObserver = ResizeObserverPolyfill;
