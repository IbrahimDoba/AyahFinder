/**
 * Authentication Service
 * Server-based authentication using JWT tokens
 * Replaces Firebase Authentication
 */
import { apiClient } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const USER_DATA_KEY = '@ayahfinder:userData';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  subscriptionTier: 'free' | 'premium';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthError {
  code: string;
  message: string;
}

/**
 * Authentication Service
 */
class AuthService {
  private currentUser: User | null = null;

  /**
   * Initialize - load user from storage
   */
  async initialize(): Promise<User | null> {
    try {
      const token = apiClient.getAuthToken();
      if (!token) {
        return null;
      }

      // Try to get current user from server
      const user = await this.getCurrentUser();
      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('[Auth] Initialization error:', error);
      // Clear invalid token
      await apiClient.setAuthToken(null);
      return null;
    }
  }

  /**
   * Register new user
   */
  async register(
    data: RegisterData
  ): Promise<{ message: string; userId: string }> {
    try {
      console.log('[Auth] Registering user:', data.email);

      const response = await apiClient.post<{
        message: string;
        userId: string;
      }>('/auth/register', data);

      console.log('[Auth] Registration successful');
      return response;
    } catch (error: any) {
      console.error('[Auth] Registration error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      console.log('[Auth] Verifying email');

      await apiClient.post('/auth/verify', { token });

      console.log('[Auth] Email verified successfully');
    } catch (error: any) {
      console.error('[Auth] Email verification error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      console.log('[Auth] Resending verification email');

      await apiClient.post('/auth/resend-verification', { email });

      console.log('[Auth] Verification email sent');
    } catch (error: any) {
      console.error('[Auth] Resend verification error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Login with email and password
   */
  async login(data: LoginData): Promise<User> {
    try {
      console.log('[Auth] Logging in user:', data.email);

      const response = await apiClient.post<AuthResponse>('/auth/login', data);

      // Store auth token
      await apiClient.setAuthToken(response.token);

      // Store user data
      this.currentUser = response.user;
      await this.saveUserData(response.user);

      console.log('[Auth] Login successful');
      return response.user;
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      console.log('[Auth] Logging out user');

      // Clear auth token
      await apiClient.setAuthToken(null);

      // Clear user data
      this.currentUser = null;
      await AsyncStorage.removeItem(USER_DATA_KEY);

      console.log('[Auth] Logout successful');
    } catch (error: any) {
      console.error('[Auth] Logout error:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user from server
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = apiClient.getAuthToken();
      if (!token) {
        return null;
      }

      const response = await apiClient.get<User>('/auth/me');

      this.currentUser = response;
      await this.saveUserData(response);

      return response;
    } catch (error: any) {
      console.error('[Auth] Get current user error:', error);

      // If 401, clear token
      if (error.response?.status === 401) {
        await apiClient.setAuthToken(null);
        this.currentUser = null;
      }

      return null;
    }
  }

  /**
   * Get cached user (doesn't make API call)
   */
  getCachedUser(): User | null {
    return this.currentUser;
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      console.log('[Auth] Requesting password reset for:', email);

      await apiClient.post('/auth/reset-password', { email });

      console.log('[Auth] Password reset email sent');
    } catch (error: any) {
      console.error('[Auth] Password reset request error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<void> {
    try {
      console.log('[Auth] Confirming password reset');

      await apiClient.post('/auth/reset-password/confirm', {
        token,
        newPassword,
      });

      console.log('[Auth] Password reset successful');
    } catch (error: any) {
      console.error('[Auth] Password reset confirmation error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Refresh auth token
   */
  async refreshToken(): Promise<void> {
    try {
      const currentToken = apiClient.getAuthToken();
      if (!currentToken) {
        throw new Error('No token to refresh');
      }

      console.log('[Auth] Refreshing token');

      const response = await apiClient.post<{ token: string }>('/auth/refresh');

      // Update auth token
      await apiClient.setAuthToken(response.token);

      console.log('[Auth] Token refreshed');
    } catch (error: any) {
      console.error('[Auth] Token refresh error:', error);

      // If refresh fails, logout user
      await this.logout();
      throw this.handleAuthError(error);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!apiClient.getAuthToken() && !!this.currentUser;
  }

  /**
   * Save user data to storage
   */
  private async saveUserData(user: User | null): Promise<void> {
    try {
      if (user) {
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(USER_DATA_KEY);
      }
    } catch (error) {
      console.error('[Auth] Failed to save user data:', error);
    }
  }

  /**
   * Handle auth errors and convert to user-friendly messages
   */
  private handleAuthError(error: any): AuthError {
    // Extract error from server response
    const serverError = error.response?.data?.error;
    const status = error.response?.status;

    let code = 'unknown';
    let message = 'An unknown error occurred';

    if (serverError) {
      message = serverError;

      // Map common server errors to codes
      if (
        message.includes('already exists') ||
        message.includes('already registered')
      ) {
        code = 'auth/email-already-in-use';
        message = 'This email is already registered. Please sign in instead.';
      } else if (
        message.includes('Invalid credentials') ||
        message.includes('Incorrect')
      ) {
        code = 'auth/invalid-credentials';
        message = 'Invalid email or password. Please try again.';
      } else if (message.includes('verify your email')) {
        code = 'auth/email-not-verified';
        message = 'Please verify your email before logging in.';
      } else if (message.includes('not found')) {
        code = 'auth/user-not-found';
        message = 'No account found with this email.';
      } else if (
        message.includes('too weak') ||
        message.includes('at least 8 characters')
      ) {
        code = 'auth/weak-password';
        message = 'Password must be at least 8 characters long.';
      } else if (message.includes('invalid') && message.includes('token')) {
        code = 'auth/invalid-token';
        message = 'Invalid or expired token. Please try again.';
      }
    } else if (status === 401) {
      code = 'auth/unauthorized';
      message = 'Authentication failed. Please login again.';
    } else if (status === 400) {
      code = 'auth/invalid-request';
      message =
        error.response?.data?.message ||
        'Invalid request. Please check your input.';
    } else if (status === 429) {
      code = 'auth/too-many-requests';
      message = 'Too many requests. Please try again later.';
    } else if (status === 500) {
      code = 'auth/server-error';
      message = 'Server error. Please try again later.';
    } else if (error.message?.includes('Network Error') || !status) {
      code = 'auth/network-error';
      message = 'Network error. Please check your connection.';
    }

    return {
      code,
      message,
    };
  }
}

// Singleton instance
const authService = new AuthService();

export default authService;
