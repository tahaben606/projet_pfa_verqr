import axios from 'axios';
import { supabase } from './supabase.js';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);
