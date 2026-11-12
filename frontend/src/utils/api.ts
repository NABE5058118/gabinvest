import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export { API_URL };

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

type RetryConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };

let refreshPromise: Promise<void> | null = null;

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/telegram',
    '/api/auth/refresh',
    '/api/auth/logout',
  ].some((endpoint) => url.includes(endpoint));
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    // Only 401 means that the access token may have expired. A 403 is an
    // authorization/permission error and must not trigger token rotation.
    if (!config || status !== 401 || config._authRetry || isAuthEndpoint(config.url)) {
      return Promise.reject(error);
    }

    config._authRetry = true;

    try {
      // All simultaneous 401 responses share one refresh request. This is
      // important because refresh tokens are rotated and the old one is revoked.
      if (!refreshPromise) {
        refreshPromise = api
          .post('/api/auth/refresh', {})
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;
      return api(config);
    } catch (refreshError) {
      // Do not hard-redirect from an interceptor. The auth context / route
      // decides what to show, and unauthenticated pages remain usable.
      return Promise.reject(refreshError);
    }
  },
);

export function getErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ??
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (err as Error)?.message ??
    fallback
  );
}

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
