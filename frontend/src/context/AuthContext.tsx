import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
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
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    return parsed?.id ? parsed : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restore the cached profile before the first render. This prevents the
  // navigation from briefly showing "Вход" on every ordinary page reload.
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [loading, setLoading] = useState(true);

  const login = useCallback((userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('favorites');
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // Local state is cleared even if the server is temporarily unavailable.
    }
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<User>('/api/auth/me');
      login(response.data);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      // A confirmed unauthorized response means the cached profile is stale.
      // Network/5xx errors do not log the user out unnecessarily.
      if (status === 401 || status === 404) {
        setUser(null);
        localStorage.removeItem('user');
      }
    }
  }, [login]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        if (isTelegramWebApp()) {
          const tgUser = getTelegramUser();
          const initData = getInitData();

          if (tgUser?.id && initData) {
            const response = await api.post('/api/auth/telegram', { initData });
            if (active) login(response.data.user);
            return;
          }
        }

        const response = await api.get<User>('/api/auth/me');
        if (active) login(response.data);
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (active && (status === 401 || status === 404)) {
          setUser(null);
          localStorage.removeItem('user');
        }
        // Keep the cached user on network errors / server startup failures.
      } finally {
        if (active) setLoading(false);
      }
    };

    void initialize();
    return () => {
      active = false;
    };
  }, [login]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'user') return;
      if (!event.newValue) {
        setUser(null);
        return;
      }
      try {
        const nextUser = JSON.parse(event.newValue) as User;
        setUser(nextUser?.id ? nextUser : null);
      } catch {
        setUser(null);
      }
    };

    const handleVisibility = () => {
      if (!document.hidden && !loading) void refreshUser();
    };

    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loading, refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
