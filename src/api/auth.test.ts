import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as client from './client';
import { otpRequest, otpVerify, login, me } from './auth';
import { tokenStore } from '../auth/tokenStore';

beforeEach(() => { localStorage.clear(); tokenStore.clear(); vi.restoreAllMocks(); });

describe('auth api', () => {
  it('otpRequest posts the identifier', async () => {
    const spy = vi.spyOn(client, 'request').mockResolvedValue({ sent: true });
    await otpRequest('catre.tech@gmail.com');
    expect(spy).toHaveBeenCalledWith('/auth/otp/request', { method: 'POST', body: { identifier: 'catre.tech@gmail.com' } });
  });

  it('otpVerify stores the returned tokens', async () => {
    vi.spyOn(client, 'request').mockResolvedValue({ access_token: 'a1', refresh_token: 'r1' });
    await otpVerify('catre.tech@gmail.com', '123456');
    expect(tokenStore.getAccess()).toBe('a1');
    expect(tokenStore.getRefresh()).toBe('r1');
  });

  it('login posts credentials and stores the returned tokens', async () => {
    const spy = vi.spyOn(client, 'request').mockResolvedValue({ access_token: 'a2', refresh_token: 'r2' });
    await login('rohan@catre.io', 's3cret-pass');
    expect(spy).toHaveBeenCalledWith('/auth/login', { method: 'POST', body: { email: 'rohan@catre.io', password: 's3cret-pass' } });
    expect(tokenStore.getAccess()).toBe('a2');
    expect(tokenStore.getRefresh()).toBe('r2');
  });

  it('me fetches the current user', async () => {
    vi.spyOn(client, 'request').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['owner'] });
    const out = await me();
    expect(out.roles).toEqual(['owner']);
  });
});
