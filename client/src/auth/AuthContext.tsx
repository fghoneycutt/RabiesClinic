import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/api';

type User = {
  id: string;
  email: string;
  name?: string;
  role?: 'staff' | 'admin';
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  // -----------------------------
  // LOAD SESSION
  // -----------------------------
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(res.data);
      } catch {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // -----------------------------
  // LOGIN
  // -----------------------------
  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', {
      email,
      password,
    });

    const { token, user } = res.data;

    localStorage.setItem('token', token);
    setUser(user);
  };

  // -----------------------------
  // LOGOUT
  // -----------------------------
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}