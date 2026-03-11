import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { db } from '@/services/db';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('agoraq_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      localStorage.removeItem('agoraq_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('agoraq_user', JSON.stringify(userData));
        return { success: true };
      }
      
      // If we get a 404 or other error, try local fallback
      const isStatic = window.location.hostname.includes('netlify.app') || 
                       window.location.hostname.includes('github.io') || 
                       window.location.hostname.includes('vercel.app') ||
                       res.status === 404;

      if (isStatic) {
        console.warn('Backend issues detected. Falling back to local authentication.');
        
        // Use the db service to get all users (handles fallback to INITIAL_USERS)
        const localUsers = await db.users.getAll();
        const foundUser = localUsers.find((u: any) => u.email.trim().toLowerCase() === email.trim().toLowerCase());
        
        if (foundUser) {
          let isCorrectPassword = false;
          if (email === 'agoraq@agoraqoficial.com' && password === 'admin') {
            isCorrectPassword = true;
          } else if (password && foundUser.password) {
            // Use db.utils.comparePassword for hashed passwords
            // Fallback to plain text comparison if it doesn't look like a hash
            if (foundUser.password.startsWith('$2a$') || foundUser.password.startsWith('$2b$')) {
              isCorrectPassword = db.utils.comparePassword(password, foundUser.password);
            } else {
              isCorrectPassword = password === foundUser.password;
            }
          } else if (!foundUser.password) {
            // Allow login if no password set (demo mode)
            isCorrectPassword = true;
          }
          
          if (isCorrectPassword) {
            const userData = { ...foundUser, lastAccess: new Date().toISOString() };
            setUser(userData);
            localStorage.setItem('agoraq_user', JSON.stringify(userData));
            return { success: true };
          } else {
            return { success: false, error: 'Senha incorreta' };
          }
        }

        // Hardcoded fallback for the main admin (even if not in localUsers yet)
        if (email === 'agoraq@agoraqoficial.com' && password === 'admin') {
          const mockUser = {
            id: '1',
            name: 'Administrador (Demo)',
            email: 'agoraq@agoraqoficial.com',
            role: 'admin',
            status: 'Ativo',
            lastAccess: new Date().toISOString(),
            saldo_acumulado: 0,
            saldo_pago: 0,
            grupo_comissao: 'MASTER'
          };
          setUser(mockUser as any);
          localStorage.setItem('agoraq_user', JSON.stringify(mockUser));
          return { success: true };
        }

        return { success: false, error: `Usuário não encontrado localmente. Verifique o e-mail ou crie o usuário no painel admin.` };
      }

      let errorMessage = 'Credenciais inválidas';
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        errorMessage = `Erro do servidor (${res.status})`;
      }
      
      return { success: false, error: errorMessage };
    } catch (e) {
      console.error('Login error:', e);
      
      // Network error fallback for Netlify/Local
      if (window.location.hostname.includes('netlify.app') || window.location.hostname === 'localhost') {
        if (email === 'agoraq@agoraqoficial.com' && password === 'admin') {
          const mockUser = {
            id: '1',
            name: 'Administrador (Offline)',
            email: 'agoraq@agoraqoficial.com',
            role: 'admin',
            status: 'Ativo',
            lastAccess: new Date().toISOString(),
            saldo_acumulado: 0,
            saldo_pago: 0,
            grupo_comissao: 'MASTER'
          };
          setUser(mockUser as any);
          localStorage.setItem('agoraq_user', JSON.stringify(mockUser));
          return { success: true };
        }
      }
      
      return { success: false, error: 'Erro de conexão: Verifique sua internet ou tente novamente.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('agoraq_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
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
