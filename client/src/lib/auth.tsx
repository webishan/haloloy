import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from './queryClient';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  country: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  login: (token: string, userData: User) => void;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUser(data.user);
      setProfile(data.profile);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
    // Profile will be fetched by checkAuth if needed
  };

  const register = async (userData: any) => {
    const response = await apiRequest('/api/auth/register', 'POST', userData);
    const data = await response.json();
    
    localStorage.setItem('token', data.token);
    setUser(data.user);
    
    // Fetch profile
    await checkAuth();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, login, register, logout, loading }}>
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