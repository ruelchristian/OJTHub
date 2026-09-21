import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isGuest: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, studentId?: string, role?: string) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ojthub_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(localStorage.getItem('ojthub_guest') === 'true');

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const profile = await api.auth.me();
          setUser(profile);
          setIsGuest(false);
        } catch {
          // Token expired or invalid
          localStorage.removeItem('ojthub_token');
          setToken(null);
          setUser(null);
        }
      } else if (isGuest) {
        // Guest trainee placeholder profile
        setUser({
          id: 'guest-user',
          email: 'guest@ojthub.local',
          fullName: 'Guest Trainee',
          role: 'Trainee'
        });
      }
      setLoading(false);
    }
    loadUser();
  }, [token, isGuest]);

  const login = async (email: string, pass: string) => {
    const res = await api.auth.login({ email, password: pass });
    localStorage.setItem('ojthub_token', res.token);
    localStorage.removeItem('ojthub_guest');
    setToken(res.token);
    setUser(res.user);
    setIsGuest(false);
  };

  const register = async (email: string, pass: string, name: string, studentId?: string, role: string = 'Trainee') => {
    const res = await api.auth.register({ email, password: pass, fullName: name, studentId, role });
    localStorage.setItem('ojthub_token', res.token);
    localStorage.removeItem('ojthub_guest');
    setToken(res.token);
    setUser(res.user);
    setIsGuest(false);
  };

  const continueAsGuest = () => {
    localStorage.setItem('ojthub_guest', 'true');
    localStorage.removeItem('ojthub_token');
    setIsGuest(true);
    setToken(null);
    setUser({
      id: 'guest-user',
      email: 'guest@ojthub.local',
      fullName: 'Guest Trainee',
      role: 'Trainee'
    });
  };

  const logout = () => {
    localStorage.removeItem('ojthub_token');
    localStorage.removeItem('ojthub_guest');
    setToken(null);
    setUser(null);
    setIsGuest(false);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const profile = await api.auth.me();
        setUser(profile);
      } catch (err) {
        console.warn('Failed to refresh user profile', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isGuest, login, register, continueAsGuest, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
