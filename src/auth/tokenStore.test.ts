import { describe, it, expect, beforeEach } from 'vitest';
import { tokenStore } from './tokenStore';

describe('tokenStore', () => {
  beforeEach(() => { localStorage.clear(); tokenStore.clear(); });

  it('starts empty', () => {
    expect(tokenStore.getAccess()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
  });

  it('stores access in memory and refresh in localStorage', () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    expect(tokenStore.getAccess()).toBe('a1');
    expect(tokenStore.getRefresh()).toBe('r1');
    expect(localStorage.getItem('catre_refresh')).toBe('r1');
  });

  it('rehydrates refresh from localStorage on read', () => {
    localStorage.setItem('catre_refresh', 'r2');
    expect(tokenStore.getRefresh()).toBe('r2');
  });

  it('clear wipes both', () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    tokenStore.clear();
    expect(tokenStore.getAccess()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
    expect(localStorage.getItem('catre_refresh')).toBeNull();
  });
});
