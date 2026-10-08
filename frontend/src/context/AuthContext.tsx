import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@utils/api';
import { getInitData, getTelegramUser, isTelegramWebApp } from '@utils/telegram';

type User = {
  id: string;
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  };

  useEffect(() => {
    const run = async () => {
      try {
        if (isTelegramWebApp()) {
          const tgUser = getTelegramUser();
          const initData = getInitData();

          if (tgUser?.id && initData) {
            const res = await api.post('/api/auth/telegram', { initData });
            login(res.data.user, res.data.token);
          } else {
            logout();
          }
          setLoading(false);
          return;
        }

        const token = localStorage.getItem('token');
        const stored = localStorage.getItem('user');
        if (token && stored) {
          try {
            const parsed = JSON.parse(stored);
            setUser(parsed as User);
            const res = await api.get<User>('/api/auth/me');
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          } catch {
            logout();
          }
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
