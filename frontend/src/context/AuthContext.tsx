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
  telegramId?: string;
  role?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('favorites');
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // Best-effort: cookies are cleared by backend regardless
    }
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  };

  const refreshUser = async () => {
    try {
      const res = await api.get<User>('/api/auth/me');
      login(res.data);
    } catch {
      // Не ломаем сессию при ошибке /me
    }
  };

  const syncFromStorage = () => {
    const stored = localStorage.getItem('user');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as User;
      if (parsed?.id && parsed.id !== user?.id) {
        setUser(parsed);
      }
    } catch {
      // ignore malformed storage
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        if (isTelegramWebApp()) {
          const tgUser = getTelegramUser();
          const initData = getInitData();

          if (tgUser?.id && initData) {
            const res = await api.post('/api/auth/telegram', { initData });
            login(res.data.user);
          } else {
            logout();
          }
          setLoading(false);
          return;
        }

        const stored = localStorage.getItem('user');
        if (stored) {
          try {
            setUser(JSON.parse(stored) as User);
          } catch {
            localStorage.removeItem('user');
          }
        }

        try {
          const res = await api.get<User>('/api/auth/me');
          login(res.data);
        } catch {
          // Не ломаем сессию: 401 может быть админской (другой набор кук).
          // Просто оставляем user = null.
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        syncFromStorage();
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        refreshUser();
      }
    };

    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.id, refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
