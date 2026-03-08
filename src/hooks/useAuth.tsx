import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPro: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isPro: false,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        // Check subscription status (deferred to avoid blocking)
        setTimeout(() => checkProStatus(session.user.id), 0);
      } else {
        setIsPro(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkProStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProStatus = async (userId: string) => {
    const { data } = await supabase.rpc('has_active_subscription', { _user_id: userId });
    setIsPro(!!data);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsPro(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isPro, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
