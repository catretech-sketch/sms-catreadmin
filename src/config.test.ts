import { describe, it, expect } from 'vitest';
import { config } from './config';

describe('config', () => {
  it('exposes apiBaseUrl from the environment', () => {
    expect(typeof config.apiBaseUrl).toBe('string');
    expect(config.apiBaseUrl.length).toBeGreaterThan(0);
  });
});
