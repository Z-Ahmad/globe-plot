import axios, { AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/';

// Type for error responses from our API
interface ErrorResponseData {
  message?: string;
  error?: string;
}

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to handle rate limiting
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return successful responses as-is
    return response;
  },
  (error: AxiosError<ErrorResponseData>) => {
    // Handle rate limiting errors
    if (error.response?.status === 429) {
      const errorData = error.response.data;
      const message = errorData?.message || errorData?.error || 'Rate limit exceeded. Please try again later.';
      toast.error(`Rate limit exceeded: ${message}`, {
        duration: 5000,
        icon: '⏰',
      });
    } else if (error.response && error.response.status >= 500) {
      // Handle server errors
      toast.error('Server error. Please try again later.', {
        duration: 4000,
        icon: '⚠️',
      });
    } else if (error.code === 'ECONNABORTED') {
      // Handle timeout errors
      toast.error('Request timed out. Please try again.', {
        duration: 4000,
        icon: '⏰',
      });
    } else if (!error.response) {
      // Handle network errors
      toast.error('Network error. Please check your connection.', {
        duration: 4000,
        icon: '📶',
      });
    }
    
    // Re-throw the error so it can still be handled by individual functions if needed
    return Promise.reject(error);
  }
);

// Convenience methods for different HTTP verbs
export const apiGet = <T = any>(url: string, config?: any): Promise<AxiosResponse<T>> => {
  return apiClient.get<T>(url, config);
};

export const apiPost = <T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => {
  return apiClient.post<T>(url, data, config);
};

export const apiPut = <T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => {
  return apiClient.put<T>(url, data, config);
};

export const apiDelete = <T = any>(url: string, config?: any): Promise<AxiosResponse<T>> => {
  return apiClient.delete<T>(url, config);
};

// Export the main client for custom usage
export default apiClient;

// Types for common API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: string;
    version: string;
    rateLimitRemaining?: number;
    cached?: boolean;
  };
}

// Rate limit specific error type
export interface RateLimitError extends Error {
  status: 429;
  rateLimitRemaining?: number;
  retryAfter?: number;
} 