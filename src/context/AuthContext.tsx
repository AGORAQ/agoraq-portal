import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';
import { db } from '@/services/db';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, role: 'admin' | 'vendedor') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await db.users.getByAuthId(session.user.id);
          setUser(profile);
        }
      } catch (e) {
        console.error('Session check error:', e);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const profile = await db.users.getByAuthId(session.user.id);
          setUser(profile);
        } catch (e) {
          console.error('Auth state change profile fetch error:', e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password?: string) => {
    try {
      if (!password) return { success: false, error: 'Senha é obrigatória' };

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const profile = await db.users.getByAuthId(data.user.id);
        setUser(profile);
        return { success: true };
      }
      
      return { success: false, error: 'Erro ao obter dados do usuário' };
    } catch (e: any) {
      console.error('Login error:', e);
      return { success: false, error: e.message || 'Erro ao tentar fazer login.' };
    }
  };

  const register = async (email: string, password: string, name: string, role: 'admin' | 'vendedor') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const profile = await db.users.create({
          auth_user_id: data.user.id,
          name,
          email,
          role,
          status: 'Ativo',
          grupo_comissao: 'MASTER'
        });
        setUser(profile);
        return { success: true };
      }
      
      return { success: false, error: 'Erro ao criar conta' };
    } catch (e: any) {
      console.error('Register error:', e);
      return { success: false, error: e.message || 'Erro ao tentar criar conta.' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (user) {
      try {
        const updatedProfile = await db.users.update(user.id, updates);
        setUser(updatedProfile);
      } catch (e) {
        console.error('Update user error:', e);
      }
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      console.error('Change password error:', e);
      return { success: false, error: e.message || 'Erro ao alterar senha.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, changePassword, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
