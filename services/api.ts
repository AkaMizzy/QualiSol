import API_CONFIG from '@/app/config/api';
import axios from 'axios';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token?: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Auto-logout on token expiry
let onUnauthorizedCallback: (() => void) | null = null;
let isLoggingOut = false;

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401 error and we're not already logging out, trigger the logout callback
    if (error.response?.status === 401 && !isLoggingOut && onUnauthorizedCallback) {
      isLoggingOut = true;
      console.log('Token expired - triggering auto-logout');
      onUnauthorizedCallback();
      // Reset the flag after a short delay to allow for re-authentication if needed
      setTimeout(() => { 
        isLoggingOut = false; 
      }, 1000);
    }
    return Promise.reject(error);
  }
);

export default api;
