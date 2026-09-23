export interface ObjectType {
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
  commercialOffer?: {
    id: string;
    objectId: string;
    content: any;
  };
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
}

export type CommercialOffer = {
  id: string;
  objectId: string;
  content: any;
};

export type LeadPayload = {
  objectId: string;
  name: string;
  phone: string;
  comment?: string;
};

export type Lead = {
  id: string;
  objectId: string;
  name: string;
  phone: string;
  comment?: string;
  status: string;
  createdAt: string;
  object?: {
    title: string;
    location: string;
    price: number;
  };
};

export const formatPrice = (price: number) =>
  `${price.toLocaleString('ru-RU')} ₽`;

export const getTelegramUserId = (): string => {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (tgUser?.id) return String(tgUser.id);
  const stored = localStorage.getItem('fallback_user_id');
  if (stored) return stored;
  const newId = 'web-user-' + Date.now();
  localStorage.setItem('fallback_user_id', newId);
  return newId;
};

export const getLeadClientId = (): string => {
  const stored = localStorage.getItem('lead_client_id');
  if (stored) return stored;
  const newId = 'lead-client-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  localStorage.setItem('lead_client_id', newId);
  return newId;
};
