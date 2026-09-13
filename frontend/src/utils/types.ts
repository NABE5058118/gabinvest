export interface ObjectType {
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
  createdAt: string;
  updatedAt: string;
  commercialOffer?: {
    id: string;
    objectId: string;
    content: any;
  };
  offerFileUrl?: string;
  offerFileName?: string;
  offerFileType?: string;
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
