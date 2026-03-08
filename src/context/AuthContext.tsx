import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { db } from '@/services/db';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
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
    // In a real app, this would be an API call
    const users = db.users.getAll();
    const foundUser = users.find(u => u.email === email && (password ? u.password === password : true));
    
    if (foundUser) {
      // Update last access
      const updatedUser = { ...foundUser, lastAccess: new Date().toISOString() };
      db.users.update(foundUser.id, { lastAccess: updatedUser.lastAccess });
      
      setUser(updatedUser);
      localStorage.setItem('agoraq_user', JSON.stringify(updatedUser));
      return true;
    }
    return false;
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
