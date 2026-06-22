import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { otpRequest, otpVerify, login as apiLogin, me as fetchMe, logout as apiLogout } from '../api/auth';
import { setOnAuthFailure } from '../api/client';
import { tokenStore } from './tokenStore';
import { can as canFor } from './rbac';
import type { Me, Role } from '../api/types';

type Status = 'loading' | 'authed' | 'anon';

interface AuthValue {
  user: Me | null;
  role: Role | null;
  status: Status;
  requestOtp: (identifier: string) => Promise<{ sent: boolean }>;
  verifyOtp: (identifier: string, code: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  finalizeSession: () => Promise<void>;
  signOut: () => Promise<void>;
  can: (action: string) => boolean;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const reset = useCallback(() => { setUser(null); setStatus('anon'); }, []);

  useEffect(() => { setOnAuthFailure(reset); }, [reset]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!tokenStore.getRefresh()) { if (alive) setStatus('anon'); return; }
      try {
        const m = await fetchMe();
        if (alive) { setUser(m); setStatus('authed'); }
      } catch {
        tokenStore.clear();
        if (alive) reset();
      }
    })();
    return () => { alive = false; };
  }, [reset]);

  const verifyOtp = useCallback(async (identifier: string, code: string) => {
    await otpVerify(identifier, code);
    const m = await fetchMe();
    setUser(m); setStatus('authed');
  }, []);

  const finalizeSession = useCallback(async () => {
    const m = await fetchMe();
    setUser(m); setStatus('authed');
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    await finalizeSession();
  }, [finalizeSession]);

  const signOut = useCallback(async () => { await apiLogout(); reset(); }, [reset]);

  const role = user?.roles?.[0] ?? null;
  const value: AuthValue = {
    user, role, status,
    requestOtp: otpRequest,
    verifyOtp,
    loginWithPassword,
    finalizeSession,
    signOut,
    can: (action) => (role ? canFor(role, action) : false),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}

export function Can({ action, children, fallback = null }: { action: string; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { can } = useAuth();
  return <>{can(action) ? children : fallback}</>;
}
