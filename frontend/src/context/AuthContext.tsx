import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@utils/api';
import { getInitData, getTelegramUser } from '@utils/telegram';

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
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      try {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(parsed as User);
        api
          .get<User>('/api/auth/me')
          .then((res) => {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          })
          .catch(async () => {
            const tgUser = getTelegramUser();
            const initData = getInitData();
            if (tgUser?.id && initData) {
              try {
                const res = await api.post('/api/auth/telegram', { initData });
                login(res.data.user, res.data.token);
              } catch {
                logout();
              }
            } else {
              logout();
            }
          })
          .finally(() => {
            setLoading(false);
          });
        return;
      } catch {
        logout();
      }
    }

    const tgUser = getTelegramUser();
    const initData = getInitData();
    if (tgUser?.id && initData) {
      setLoading(true);
      api
        .post('/api/auth/telegram', { initData })
        .then((res) => {
          login(res.data.user, res.data.token);
        })
        .catch(() => {
          setLoading(false);
        });
      return;
    }

    setLoading(false);
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
