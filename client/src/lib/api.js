import axios from 'axios';
import { supabase } from './supabase.js';

/**
 * VITE_API_URL may be `http://localhost:4000` or `http://localhost:4000/api`.
 * Axios paths are like `/me`, `/dashboard` — base must end with `/api`.
 */
function resolveApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (!raw) return '/api';
  const base = raw.replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}

export const api = axios.create({ baseURL: resolveApiBaseUrl() });

/** Last access token from React session — avoids races where `getSession()` lags behind state. */
let memoryAccessToken = null;
export function setApiAccessToken(token) {
  memoryAccessToken = token || null;
}

api.interceptors.request.use(async (config) => {
  let token = memoryAccessToken;
  if (!token) {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg =
      err.response?.data?.detail || err.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);
