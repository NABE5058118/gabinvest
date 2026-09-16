import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type User = {
  id: string;
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
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
        setUser(JSON.parse(stored));
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
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
