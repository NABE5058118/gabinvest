import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

type FavoritesContextValue = {
  favoriteIds: Set<string>;
  toggleFavorite: (objectId: string) => void;
  isFavorite: (objectId: string) => boolean;
  loading: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem('favorites');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as string[];
          setFavoriteIds(new Set(parsed));
        } catch {
          // ignore
        }
      }
      setLoading(false);
      return;
    }

    api
      .get<{ object: { id: string } }[]>('/api/favorites')
      .then((res) => {
        const ids = new Set(res.data.map((f) => f.object.id));
        setFavoriteIds(ids);
      })
      .catch(() => {
        const stored = localStorage.getItem('favorites');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as string[];
            setFavoriteIds(new Set(parsed));
          } catch {
            // ignore
          }
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const toggleFavorite = async (objectId: string) => {
    if (!user) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(objectId)) {
          next.delete(objectId);
        } else {
          next.add(objectId);
        }
        localStorage.setItem('favorites', JSON.stringify(Array.from(next)));
        return next;
      });
      return;
    }

    try {
      const isFav = favoriteIds.has(objectId);
      if (isFav) {
        await api.delete(`/api/favorites/${objectId}`);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(objectId);
          return next;
        });
      } else {
        await api.post(`/api/favorites/${objectId}`, {});
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.add(objectId);
          return next;
        });
      }
    } catch {
      // ignore
    }
  };

  const isFavorite = (objectId: string) => favoriteIds.has(objectId);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, toggleFavorite, isFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
}
