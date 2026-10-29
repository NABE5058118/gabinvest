import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export { API_URL };

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response || (response.status !== 401 && response.status !== 403)) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push(() => {
          api(config).then(resolve).catch((err) => reject(err));
        });
      });
    }

    isRefreshing = true;
    try {
      await api.post('/api/auth/refresh', {});
      pendingRequests.forEach((cb) => cb());
      pendingRequests = [];
      return api(config);
    } catch {
      pendingRequests = [];
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

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
  content: unknown;
};

export type LeadPayload = {
  objectId: string;
  name: string;
  phone: string;
  comment?: string;
};
