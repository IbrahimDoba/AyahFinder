/**
 * API Client
 * HTTP client with retry logic and interceptors
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/constants/config';

// Storage keys
const AUTH_TOKEN_KEY = '@ayahfinder:authToken';
const DEVICE_ID_KEY = '@ayahfinder:deviceId';

class ApiClient {
  private client: AxiosInstance;
  private deviceId: string | null = null;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.initializeDeviceId();
    this.loadAuthToken();
    this.setupInterceptors();
  }

  /**
   * Initialize or retrieve device ID for anonymous tracking
   */
  private async initializeDeviceId(): Promise<void> {
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      this.deviceId = deviceId;
    } catch (error) {
      console.error('[API] Failed to initialize device ID:', error);
    }
  }

  /**
   * Load auth token from storage
   */
  private async loadAuthToken(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      this.authToken = token;
    } catch (error) {
      console.error('[API] Failed to load auth token:', error);
    }
  }

  /**
   * Set auth token (called after login)
   */
  async setAuthToken(token: string | null): Promise<void> {
    this.authToken = token;
    if (token) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  /**
   * Get current auth token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Get device ID
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async config => {
        // Add auth token if available
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add device ID for anonymous tracking
        if (this.deviceId) {
          config.headers['x-device-id'] = this.deviceId;
        }

        if (__DEV__) {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        const config = error.config;

        // Handle 401 Unauthorized - token expired or invalid
        if (error.response?.status === 401 && config) {
          // Clear auth token
          await this.setAuthToken(null);

          // Don't retry auth endpoints to avoid infinite loops
          const url = config.url || '';
          if (url.includes('/auth/')) {
            return Promise.reject(error);
          }

          // For other endpoints, reject and let the app handle logout
          return Promise.reject(error);
        }

        // Retry logic for network errors
        if (this.shouldRetry(error) && config) {
          const retryCount = (config as any).__retryCount || 0;

          if (retryCount < API_CONFIG.RETRY_ATTEMPTS) {
            (config as any).__retryCount = retryCount + 1;

            // Exponential backoff
            const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, retryCount);
            await this.sleep(delay);

            if (__DEV__) {
              console.log(
                `[API] Retry ${retryCount + 1}/${API_CONFIG.RETRY_ATTEMPTS}`
              );
            }

            return this.client(config);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    // Retry on network errors or 5xx status codes
    if (!error.response) {
      return true; // Network error
    }

    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  /**
   * POST with FormData (for file uploads)
   */
  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    const response = await this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();
