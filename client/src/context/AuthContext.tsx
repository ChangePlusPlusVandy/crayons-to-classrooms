import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_EMAIL = process.env.REACT_APP_DEV_EMAIL;
const DEV_PASSWORD = process.env.REACT_APP_DEV_PASSWORD;
const IS_DEV_AUTOLOGIN = Boolean(DEV_EMAIL && DEV_PASSWORD);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session: existing } } = await supabase.auth.getSession();

      if (!existing && IS_DEV_AUTOLOGIN) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: DEV_EMAIL!,
          password: DEV_PASSWORD!,
        });
        if (error) {
          console.error('[DEV] Auto-login failed:', error.message);
        } else {
          setSession(data.session);
          console.log(`DEV: AUTOMATICALLY LOGGED IN AS ${data.user.email}`)
        }
      } else {
        setSession(existing);
      }

      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
