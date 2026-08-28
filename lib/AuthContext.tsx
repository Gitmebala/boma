import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, Profile } from './supabase';

interface AuthCtx {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  sendCode: (phone: string) => Promise<{ error: string | null }>;
  verifyCode: (phone: string, token: string) => Promise<{ error: string | null }>;
  devSignIn: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id);
      setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) loadProfile(newSession.user.id);
      else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const sendCode = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error: error?.message ?? null };
  };

  const verifyCode = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    return { error: error?.message ?? null };
  };

  /**
   * DEV-ONLY escape hatch: no SMS provider is configured yet, so real phone
   * OTP can't deliver. `demo@boma.dev` is a real, pre-confirmed Supabase
   * user seeded directly in the database (bypassing the confirmation-email
   * step, which is what was hitting Supabase's rate limit) — signing in is
   * a genuine session, not a fake one. Only ever rendered behind `__DEV__`;
   * never shown to a real farmer.
   */
  const devSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'demo@boma.dev',
      password: 'boma-demo-preview-2026',
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider value={{ session, profile, initializing, sendCode, verifyCode, devSignIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
