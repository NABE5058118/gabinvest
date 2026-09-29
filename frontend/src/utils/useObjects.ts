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

export function useObjects() {
  const [objects, setObjects] = useState<ObjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ObjectsResponse>('/api/objects');
      setObjects(res.data.objects);
    } catch {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  useEffect(() => {
    const handler = () => {
      fetchObjects();
    };
    window.addEventListener('objects:refresh', handler);
    window.addEventListener('focus', handler);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') handler();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('objects:refresh', handler);
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchObjects]);

  return { objects, loading, error, refetch: fetchObjects };
}
