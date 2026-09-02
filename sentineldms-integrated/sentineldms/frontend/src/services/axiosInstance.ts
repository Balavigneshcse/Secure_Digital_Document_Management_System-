import axios from 'axios';

// Point this at Balavignesh's base URL once it's live, e.g. import.meta.env.VITE_API_BASE_URL
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sentineldms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('sentineldms_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
