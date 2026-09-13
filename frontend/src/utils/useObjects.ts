import { useState, useEffect } from 'react';
import { api } from './api';

export type ObjectType = {
  id: string;
  title: string;
  type: string;
  price: number;
  yieldPercent: number;
  location: string;
  city?: string;
  area: number;
  roi?: number;
  image?: string;
  description?: string;
  offerFileUrl?: string;
  offerFileName?: string;
  offerFileType?: string;
  createdAt: string;
  updatedAt: string;
};

export function useObjects() {
  const [objects, setObjects] = useState<ObjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ objects: ObjectType[] }>('/api/objects')
      .then((res) => setObjects(res.data.objects))
      .catch(() => setError('Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  return { objects, loading, error };
}
