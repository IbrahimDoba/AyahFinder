/**
 * Auth Store
 * Global state for authentication using server-based auth
 */
import { create } from 'zustand';
import authService, { User } from '../../services/auth/AuthService';
import serverUsageService from '../../services/usage/ServerUsageService';
import revenueCatService from '../../services/revenuecat/RevenueCatService';

interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;
  setError: (error: string | null) => void;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  // Actions
  setUser: (user) => {
    set({ user });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setInitialized: (isInitialized) => set({ isInitialized }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  /**
   * Initialize auth state
   * Should be called once on app startup
   */
  initialize: async () => {
    try {
      console.log('🔐 Initializing auth store...');

      // Try to get current user from server
      const currentUser = await authService.initialize();
      get().setUser(currentUser);

      set({ isInitialized: true });
      console.log('✅ Auth store initialized', currentUser ? `User: ${currentUser.email}` : 'No user');
    } catch (error: any) {
      console.error('❌ Error initializing auth store:', error);
      set({ error: error.message, isInitialized: true });
    }
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('🔑 Signing in...');

      const user = await authService.login({ email, password });
      get().setUser(user);

      // Link RevenueCat to this user
      await revenueCatService.logIn(user.id);

      console.log('✅ Sign in successful');
    } catch (error: any) {
      console.error('❌ Sign in failed:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Sign up with email and password
   */
  signUp: async (email: string, password: string, displayName?: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('📝 Signing up...');

      const response = await authService.register({
        email,
        password,
        displayName,
      });

      // After registration, user needs to verify email
      // Don't set user in store yet - they need to verify first

      console.log('✅ Sign up successful - verification email sent');
      console.log('User ID:', response.userId);
    } catch (error: any) {
      console.error('❌ Sign up failed:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Verify email with token from verification link
   */
  verifyEmail: async (token: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('📧 Verifying email...');

      await authService.verifyEmail(token);

      console.log('✅ Email verified successfully');
    } catch (error: any) {
      console.error('❌ Email verification failed:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Resend verification email
   */
  resendVerificationEmail: async (email: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('📧 Resending verification email...');

      await authService.resendVerificationEmail(email);

      console.log('✅ Verification email sent');
    } catch (error: any) {
      console.error('❌ Failed to resend verification email:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Request password reset email
   */
  requestPasswordReset: async (email: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('🔒 Requesting password reset...');

      await authService.requestPasswordReset(email);

      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Password reset request failed:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Confirm password reset with token
   */
  confirmPasswordReset: async (token: string, newPassword: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('🔒 Confirming password reset...');

      await authService.confirmPasswordReset(token, newPassword);

      console.log('✅ Password reset successful');
    } catch (error: any) {
      console.error('❌ Password reset confirmation failed:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('👋 Signing out...');

      // Log out from RevenueCat (reset to anonymous ID)
      await revenueCatService.logOut();
      
      await authService.logout();
      get().setUser(null);

      console.log('✅ Sign out successful');
    } catch (error: any) {
      console.error('❌ Sign out failed:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Reset store to initial state
   */
  reset: () => set({
    user: null,
    isLoading: false,
    isInitialized: false,
    error: null,
  }),
}));
