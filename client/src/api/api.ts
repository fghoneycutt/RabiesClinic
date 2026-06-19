import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// ------------------------------------
// REQUEST INTERCEPTOR
// Automatically attach JWT token
// ------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ------------------------------------
// RESPONSE INTERCEPTOR
// Handle auth failures globally
// ------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // If token is invalid/expired → force logout
    if (status === 401) {
      localStorage.removeItem('token');

      // Optional: hard redirect to login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const registerUser = async (data: {
  email: string;
  password: string;
  role?: string;
}) => {
  const res = await api.post('/auth/register', data);
  return res.data;
};