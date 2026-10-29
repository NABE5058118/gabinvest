import axios from 'axios';
import { API_URL } from './api';

export const adminApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let adminIsRefreshing = false;
let adminPendingRequests: Array<() => void> = [];

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response || (response.status !== 401 && response.status !== 403)) {
      return Promise.reject(error);
    }

    if (adminIsRefreshing) {
      return new Promise((resolve, reject) => {
        adminPendingRequests.push(() => {
          adminApi(config).then(resolve).catch((err) => reject(err));
        });
      });
    }

    adminIsRefreshing = true;
    try {
      const res = await adminApi.post('/api/admin/auth/refresh', {});
      if (res.status === 200) {
        adminPendingRequests.forEach((cb) => cb());
        adminPendingRequests = [];
        return adminApi(config);
      }
      throw new Error('refresh failed');
    } catch {
      adminPendingRequests = [];
      localStorage.removeItem('adminUser');
      window.location.href = '/admin-login';
      return Promise.reject(error);
    } finally {
      adminIsRefreshing = false;
    }
  },
);
