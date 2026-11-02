import axios from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for clean error extraction
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    let message = 'An unexpected network error occurred';
    if (error.response) {
      message = error.response.data?.message || `Server error (${error.response.status})`;
    } else if (error.request) {
      message = 'Cannot connect to backend server. Please verify backend is running on port 4000.';
    } else {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

export const api = {
  // Check backend status
  getHealth: () => apiClient.get('/health'),

  // Get spreadsheet info & available tabs
  getSheetsInfo: () => apiClient.get('/sheets'),

  // Get raw daily sheet data
  getDailyData: (date = '') => {
    const endpoint = date ? `/daily-data-by-date?date=${encodeURIComponent(date)}` : '/daily-data';
    return apiClient.get(endpoint);
  },

  // Get processed dashboard KPIs, plant data, charts, and supplier status
  getDashboard: (date = '') => {
    const endpoint = date ? `/dashboard?date=${encodeURIComponent(date)}` : '/dashboard';
    return apiClient.get(endpoint);
  },

  // Get diagnostics on sheet layout
  getLayoutDiagnostics: (date = '') => {
    const endpoint = date ? `/diagnostics/layout?date=${encodeURIComponent(date)}` : '/diagnostics/layout';
    return apiClient.get(endpoint);
  },

  // Force clear server-side cache
  clearCache: () => apiClient.post('/cache/clear')
};

export default api;

