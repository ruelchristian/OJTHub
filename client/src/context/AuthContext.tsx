import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isGuest: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (
    email: string, 
    pass: string, 
    name: string, 
    studentId?: string, 
    role?: string,
    schoolName?: string,
    department?: string,
    supervisorCode?: string
  ) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ojthub_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const profile = await api.auth.me();
          setUser(profile);
        } catch {
          // Token expired or invalid
          localStorage.removeItem('ojthub_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email: string, pass: string): Promise<User> => {
    const res = await api.auth.login({ email, password: pass });
    localStorage.setItem('ojthub_token', res.token);
    localStorage.removeItem('ojthub_guest');
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (
    email: string, 
    pass: string, 
    name: string, 
    studentId?: string, 
    role: string = 'Trainee',
    schoolName?: string,
    department?: string,
    supervisorCode?: string
  ) => {
    const res = await api.auth.register({ 
      email, 
      password: pass, 
      fullName: name, 
      studentId, 
      role,
      schoolName,
      department,
      supervisorCode 
    });
    localStorage.setItem('ojthub_token', res.token);
    localStorage.removeItem('ojthub_guest');
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('ojthub_token');
    localStorage.removeItem('ojthub_guest');
    setToken(null);
    setUser(null);
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
    <AuthContext.Provider value={{ user, token, loading, isGuest: false, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
