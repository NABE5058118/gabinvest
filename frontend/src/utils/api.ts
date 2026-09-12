import axios from 'axios';
import { getInitData } from '../utils/telegram';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const initData = getInitData();
  if (initData) {
    config.headers['x-telegram-init-data'] = initData;
  }
  return config;
});

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
  createdAt: string;
  updatedAt: string;
};

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
