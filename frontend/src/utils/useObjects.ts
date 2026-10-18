import { useState, useEffect, useCallback } from 'react';
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
  image?: string;
  description?: string;
  monthlyRent?: number;
  annualRevenue?: number;
  leaseEndDate?: string;
  anchorTenantName?: string;
  priceIndicator?: 'below_market' | 'market' | 'above_market';
  images?: Array<{ id: string; url: string; sort: number }>;
  offerFileUrl?: string;
  offerFileName?: string;
  offerFileType?: string;
  createdAt: string;
  updatedAt: string;
  tenants?: Array<{
    id: string;
    name: string;
    isAnchor: boolean;
    category?: string;
  }>;
  leases?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    isFixed: boolean;
    percentOfTurnover?: number;
    indexationPercent?: number;
    tenant: { id: string; name: string };
  }>;
  expenses?: Array<{
    id: string;
    name: string;
    amount: number;
    compensatedByTenant: boolean;
    ownerOnly: boolean;
    note?: string;
  }>;
  legalConstraints?: Array<{
    id: string;
    type: string;
    description: string;
  }>;
  engineeringSpec?: {
    id: string;
    electricityKw?: number;
    waterParams?: string;
    gasParams?: string;
  };
  vatRate?: {
    id: string;
    rate: number;
    note?: string;
  };
  moderation?: {
    id: string;
    status: string;
    note?: string;
  };
  placement?: {
    id: string;
    type: string;
    price?: number;
    isExclusive: boolean;
  };
};

interface ObjectsResponse {
  objects: ObjectType[];
  total: number;
  page: number;
  totalPages: number;
  rotationTimestamp?: string;
}

export type ObjectQueryFilters = {
  types?: string[];
  minPrice?: string;
  maxPrice?: string;
  minArea?: string;
  maxArea?: string;
  city?: string;
  anchorTenant?: string;
  sortBy?: 'createdAt' | 'price' | 'area' | 'yieldPercent' | 'leaseEndDate';
  sortOrder?: 'asc' | 'desc';
  minYield?: string;
  maxYield?: string;
  leaseEndBefore?: string;
  leaseEndAfter?: string;
};

const PAGE_SIZE = 100;

export function useObjects(filters: ObjectQueryFilters = {}) {
  const [objects, setObjects] = useState<ObjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersKey = JSON.stringify(filters);

  const fetchObjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryFilters = JSON.parse(filtersKey) as ObjectQueryFilters;
      const params = new URLSearchParams({ page: '1', limit: String(PAGE_SIZE) });
      for (const [key, value] of Object.entries(queryFilters)) {
        if (value === undefined || value === null || value === '') continue;
        if (key === 'types') {
          const types = value as string[];
          if (types.length === 0) continue;
          types.forEach((t) => params.append('types', t));
          continue;
        }
        params.set(key, String(value));
      }

      const first = await api.get<ObjectsResponse>(`/api/objects?${params.toString()}`);
      const allObjects = [...first.data.objects];
      for (let page = 2; page <= first.data.totalPages; page += 1) {
        params.set('page', String(page));
        const next = await api.get<ObjectsResponse>(`/api/objects?${params.toString()}`);
        allObjects.push(...next.data.objects);
      }
      setObjects(allObjects);
    } catch {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [filtersKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchObjects();
  }, [fetchObjects]);

  useEffect(() => {
    const handler = () => { fetchObjects(); };
    window.addEventListener('objects:refresh', handler);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') handler();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('objects:refresh', handler);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchObjects]);

  return { objects, loading, error, refetch: fetchObjects };
}
