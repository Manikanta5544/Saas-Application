import React, { createContext, useEffect, useState } from 'react';
import { AuthService, type User } from '../lib/auth';
import { supabase } from '../lib/supabase';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      AuthService.createTestUsers();
    }
   
    AuthService.getCurrentUser().then(setUser).finally(() => setLoading(false));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          const currentUser = await AuthService.getCurrentUser();
          setUser(currentUser);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const user = await AuthService.signIn(email, password);
    setUser(user);
  };

  const signOut = async () => {
    await AuthService.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    const currentUser = await AuthService.getCurrentUser();
    setUser(currentUser);
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
