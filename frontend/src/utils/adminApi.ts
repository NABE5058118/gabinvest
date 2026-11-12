import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_URL, getErrorMessage } from './api';

export { getErrorMessage };

export const adminApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

type RetryConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };

let refreshPromise: Promise<void> | null = null;

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryConfig | undefined;
    const url = config?.url || '';
    const status = error.response?.status;
    const isAuthEndpoint = [
      '/api/admin/auth/login',
      '/api/admin/auth/refresh',
      '/api/admin/auth/logout',
    ].some((endpoint) => url.includes(endpoint));

    if (!config || status !== 401 || config._authRetry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    config._authRetry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = adminApi
          .post('/api/admin/auth/refresh', {})
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
      }
      await refreshPromise;
      return adminApi(config);
    } catch (refreshError) {
      localStorage.removeItem('adminUser');
      return Promise.reject(refreshError);
    }
  },
);
