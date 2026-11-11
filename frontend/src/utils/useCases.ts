import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

export type CaseItem = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  price?: number | null;
  imageBefore?: string | null;
  imageAfter?: string | null;
  status?: string;
  images?: Array<{ id: string; url: string; sort: number }>;
  createdAt: string;
  updatedAt: string;
};

interface CasesResponse {
  cases: CaseItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAGE_SIZE = 100;

export function useCases() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: '1', limit: String(PAGE_SIZE) });
      const first = await api.get<CasesResponse>(`/api/cases?${params.toString()}`);
      const allCases = [...first.data.cases];
      for (let page = 2; page <= first.data.totalPages; page += 1) {
        params.set('page', String(page));
        const next = await api.get<CasesResponse>(`/api/cases?${params.toString()}`);
        allCases.push(...next.data.cases);
      }
      setCases(allCases);
    } catch {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    const handler = () => { fetchCases(); };
    window.addEventListener('cases:refresh', handler);
    return () => {
      window.removeEventListener('cases:refresh', handler);
    };
  }, [fetchCases]);

  return { cases, loading, error, refetch: fetchCases };
}
