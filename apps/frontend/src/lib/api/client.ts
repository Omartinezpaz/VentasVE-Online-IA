import axios from 'axios';
import { getAccessToken, setAccessToken } from '../auth/storage';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  withCredentials: true
});

const refreshClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  withCredentials: true
});

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

api.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) {
    if (!config.headers) {
      config.headers = {};
    }
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status;
    const originalRequest = error.config;

    if (status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push(token => {
          if (!token) {
            reject(error);
            return;
          }
          if (!originalRequest.headers) {
            originalRequest.headers = {};
          }
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const res = await refreshClient.post<{ accessToken: string }>('/auth/refresh', {});
      const newToken = res.data.accessToken;
      setAccessToken(newToken);
      pendingRequests.forEach(cb => cb(newToken));
      pendingRequests = [];
      if (!originalRequest.headers) {
        originalRequest.headers = {};
      }
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      pendingRequests.forEach(cb => cb(null));
      pendingRequests = [];
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
