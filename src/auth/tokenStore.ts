import type { AuthTokens } from '../api/types';

const REFRESH_KEY = 'catre_refresh';
let accessToken: string | null = null;

export const tokenStore = {
  getAccess(): string | null {
    return accessToken;
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: AuthTokens): void {
    accessToken = tokens.access_token;
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  },
  clear(): void {
    accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
};
