/**
 * Auth Store
 * Global state for authentication
 */
import { create } from 'zustand';
import { User } from '../../domain/entities/User';
import firebaseAuthService from '../../services/auth/FirebaseAuth';
import usageValidator from '../../services/usage/UsageValidator';

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
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
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

    // Update usage validator with user context
    if (user) {
      usageValidator.setUser(user.uid, user.subscriptionTier);
    } else {
      usageValidator.setUser(null, 'anonymous');
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  setInitialized: (isInitialized) => set({ isInitialized }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  /**
   * Initialize auth state and listen to auth changes
   * Should be called once on app startup
   */
  initialize: async () => {
    try {
      console.log('🔐 Initializing auth store...');

      // Listen to auth state changes
      firebaseAuthService.onAuthStateChanged((user) => {
        console.log('👤 Auth state changed:', user ? user.email : 'No user');
        get().setUser(user);
      });

      // Get current user
      const currentUser = await firebaseAuthService.getCurrentUserEntity();
      get().setUser(currentUser);

      set({ isInitialized: true });
      console.log('✅ Auth store initialized');
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

      const user = await firebaseAuthService.signIn({ email, password });

      // Migrate anonymous usage to user account
      await usageValidator.migrateAnonymousUsage(user.uid);

      get().setUser(user);

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

      const user = await firebaseAuthService.signUp({
        email,
        password,
        displayName,
      });

      // Migrate anonymous usage to user account
      await usageValidator.migrateAnonymousUsage(user.uid);

      get().setUser(user);

      console.log('✅ Sign up successful');
    } catch (error: any) {
      console.error('❌ Sign up failed:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Sign in with Google
   */
  signInWithGoogle: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('🔑 Signing in with Google...');

      const user = await firebaseAuthService.signInWithGoogle();

      // Migrate anonymous usage to user account
      await usageValidator.migrateAnonymousUsage(user.uid);

      get().setUser(user);

      console.log('✅ Google sign in successful');
    } catch (error: any) {
      console.error('❌ Google sign in failed:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Sign in with Apple
   */
  signInWithApple: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('🍎 Signing in with Apple...');

      const user = await firebaseAuthService.signInWithApple();

      // Migrate anonymous usage to user account
      await usageValidator.migrateAnonymousUsage(user.uid);

      get().setUser(user);

      console.log('✅ Apple sign in successful');
    } catch (error: any) {
      console.error('❌ Apple sign in failed:', error);
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

      await firebaseAuthService.signOut();
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
