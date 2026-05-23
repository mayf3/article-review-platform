import axios from 'axios';
import type { AxiosError } from 'axios';

// Nginx 代理: /article-review/api/* → http://127.0.0.1:3000/api/*
// 所以前端请求 /article-review/api/xxx 即可
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/article-review/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    const message = error.response?.data?.error || error.message || '请求失败';
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
