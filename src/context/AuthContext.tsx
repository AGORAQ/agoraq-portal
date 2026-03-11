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

      if (isStatic || res.status === 404 || res.status === 500) {
        console.warn('Backend issues or static environment detected. Falling back to local authentication.');
        
        // 1. Try to get users via the db service
        let localUsers = [];
        try {
          localUsers = await db.users.getAll();
        } catch (e) {
          console.error('Failed to get users from db service', e);
        }

        // 2. If db service failed or returned empty, try direct localStorage as last resort
        if (!localUsers || localUsers.length <= 1) {
          try {
            const rawData = localStorage.getItem('agoraq_users');
            if (rawData) {
              const parsed = JSON.parse(rawData);
              if (Array.isArray(parsed) && parsed.length > 0) {
                localUsers = parsed;
              }
            }
          } catch (e) {
            console.error('Failed to parse agoraq_users from localStorage', e);
          }
        }
        
        // 3. Search for the user with extreme prejudice (trim, lowercase, string conversion)
        const searchEmail = String(email || '').trim().toLowerCase();
        
        // Debug log (visible in console)
        console.log(`Attempting local login for: ${searchEmail}. Users available: ${localUsers.length}`);
        
        const foundUser = localUsers.find((u: any) => {
          const uEmail = String(u.email || '').trim().toLowerCase();
          return uEmail === searchEmail;
        });
        
        if (foundUser) {
          console.log('User found locally:', foundUser.email);
          let isCorrectPassword = false;
          const providedPassword = String(password || '');

          if (searchEmail === 'agoraq@agoraqoficial.com' && providedPassword === 'admin') {
            isCorrectPassword = true;
          } else if (providedPassword && foundUser.password) {
            const storedPassword = String(foundUser.password);
            // Use db.utils.comparePassword for hashed passwords
            // Fallback to plain text comparison if it doesn't look like a hash
            if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
              try {
                isCorrectPassword = db.utils.comparePassword(providedPassword, storedPassword);
              } catch (e) {
                console.error('Bcrypt comparison failed', e);
                isCorrectPassword = providedPassword === storedPassword;
              }
            } else {
              isCorrectPassword = providedPassword === storedPassword;
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
            return { success: false, error: 'Senha incorreta. Verifique se digitou corretamente.' };
          }
        }

        // 4. Ultimate hardcoded fallback for the main admin
        if (searchEmail === 'agoraq@agoraqoficial.com' && String(password || '') === 'admin') {
          console.log('Using emergency admin fallback');
          const mockUser = {
            id: '1',
            name: 'Administrador (Emergência)',
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

        console.error(`User not found in local list of ${localUsers.length} users`);
        return { success: false, error: `Usuário '${email}' não encontrado. Verifique o e-mail ou peça ao administrador para recriar o usuário.` };
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
