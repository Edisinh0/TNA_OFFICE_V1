import axios from 'axios';
import { getAuthHeader, logout } from './auth';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const apiClient = axios.create({
  baseURL: API,
});

apiClient.interceptors.request.use((config) => {
  const authHeader = getAuthHeader();
  if (authHeader.Authorization) {
    config.headers = { ...config.headers, ...authHeader };
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API };