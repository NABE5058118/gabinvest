import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@utils/api';

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
    let cancelled = false;

    const readGuestFavorites = (): string[] => {
      const stored = localStorage.getItem('favorites');
      if (!stored) return [];
      try {
        const parsed = JSON.parse(stored) as unknown;
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
      } catch {
        return [];
      }
    };

    const load = async () => {
      if (!user) {
        setFavoriteIds(new Set(readGuestFavorites()));
        setLoading(false);
        return;
      }

      try {
        const guestIds = readGuestFavorites();
        if (guestIds.length) {
          await api.post('/api/favorites/merge', { objectIds: guestIds.slice(0, 1000) });
          localStorage.removeItem('favorites');
        }

        // Preserve the existing response shape while requesting bounded server pages.
        const first = await api.get<{ object: { id: string } }[]>('/api/favorites');
        const all = [...first.data];
        for (let page = 2; page <= 10000 && all.length % 100 === 0 && all.length > 0; page += 1) {
          const { data } = await api.get<{ object: { id: string } }[]>('/api/favorites', { params: { page, limit: 100 } });
          all.push(...data);
          if (data.length < 100) break;
        }
        if (!cancelled) setFavoriteIds(new Set(all.map((f) => f.object.id)));
      } catch {
        if (!cancelled) setFavoriteIds(new Set(readGuestFavorites()));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void load();
    return () => { cancelled = true; };
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

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
}
