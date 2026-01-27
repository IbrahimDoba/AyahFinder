/**
 * Firebase Authentication Service
 * Wrapper around Firebase Auth for email/password and social authentication
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import {
  User,
  UserCredentials,
  UserRegistration,
  UserProfileUpdate,
  createUserFromFirebase,
  AuthProvider,
  SubscriptionTier,
} from '../../domain/entities/User';
import { SOCIAL_AUTH_CONFIG } from '../../constants/socialAuth';

export interface AuthError {
  code: string;
  message: string;
}

/**
 * Firebase Authentication Service
 */
class FirebaseAuthService {
  private auth: FirebaseAuthTypes.Module;

  constructor() {
    this.auth = auth();
    this.initializeGoogleSignIn();
  }

  /**
   * Initialize Google Sign-In
   */
  private initializeGoogleSignIn() {
    try {
      GoogleSignin.configure({
        webClientId: SOCIAL_AUTH_CONFIG.google.webClientId,
        offlineAccess: SOCIAL_AUTH_CONFIG.google.offlineAccess,
      });
      console.log('✅ Google Sign-In configured');
    } catch (error) {
      console.warn('⚠️ Google Sign-In configuration error:', error);
      // Don't throw - app can still work without Google Sign-In
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): FirebaseAuthTypes.User | null {
    return this.auth.currentUser;
  }

  /**
   * Get current user as domain entity
   */
  async getCurrentUserEntity(): Promise<User | null> {
    const firebaseUser = this.getCurrentUser();

    if (!firebaseUser) {
      return null;
    }

    // Fetch user data from Firestore to get subscription tier
    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .get();

      const userData = userDoc.data();
      const authProvider = (userData?.authProvider || 'email') as AuthProvider;
      const subscriptionTier = (userData?.subscriptionTier || 'free') as SubscriptionTier;

      return createUserFromFirebase(firebaseUser, authProvider, subscriptionTier);
    } catch (error) {
      console.error('Error fetching user data from Firestore:', error);
      // Return user with default values if Firestore fetch fails
      return createUserFromFirebase(firebaseUser, 'email', 'free');
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(registration: UserRegistration): Promise<User> {
    try {
      console.log('📝 Signing up user:', registration.email);

      // Create user in Firebase Auth
      const userCredential = await this.auth.createUserWithEmailAndPassword(
        registration.email,
        registration.password
      );

      const firebaseUser = userCredential.user;

      // Update display name if provided
      if (registration.displayName) {
        await firebaseUser.updateProfile({
          displayName: registration.displayName,
        });
      }

      // Send email verification
      await firebaseUser.sendEmailVerification();
      console.log('📧 Verification email sent');

      // Create user document in Firestore
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: registration.displayName || null,
        photoURL: null,
        authProvider: 'email' as AuthProvider,
        subscriptionTier: 'free' as SubscriptionTier,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastLoginAt: firestore.FieldValue.serverTimestamp(),
        emailVerified: false,
      };

      await firestore().collection('users').doc(firebaseUser.uid).set(userData);

      console.log('✅ User created successfully');

      return createUserFromFirebase(firebaseUser, 'email', 'free');
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(credentials: UserCredentials): Promise<User> {
    try {
      console.log('🔑 Signing in user:', credentials.email);

      const userCredential = await this.auth.signInWithEmailAndPassword(
        credentials.email,
        credentials.password
      );

      const firebaseUser = userCredential.user;

      // Update last login time in Firestore
      await firestore().collection('users').doc(firebaseUser.uid).update({
        lastLoginAt: firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ User signed in successfully');

      // Fetch full user data
      const user = await this.getCurrentUserEntity();
      if (!user) {
        throw new Error('Failed to fetch user data after sign in');
      }

      return user;
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      console.log('👋 Signing out user');

      // Sign out from Google if user was signed in with Google
      await this.signOutFromGoogle();

      // Sign out from Firebase
      await this.auth.signOut();

      console.log('✅ User signed out successfully');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<User> {
    try {
      console.log('🔑 Starting Google Sign-In...');

      // Check if device supports Google Play Services (Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get user info from Google
      const userInfo = await GoogleSignin.signIn();

      // Get Google credential
      const { idToken } = userInfo;

      if (!idToken) {
        throw new Error('Failed to get Google ID token');
      }

      // Create Firebase credential
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase with Google credential
      const userCredential = await this.auth.signInWithCredential(googleCredential);
      const firebaseUser = userCredential.user;

      // Check if this is a new user
      const isNewUser = userCredential.additionalUserInfo?.isNewUser || false;

      if (isNewUser) {
        // Create user document in Firestore for new users
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || null,
          authProvider: 'google' as AuthProvider,
          subscriptionTier: 'free' as SubscriptionTier,
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastLoginAt: firestore.FieldValue.serverTimestamp(),
          emailVerified: firebaseUser.emailVerified,
        };

        await firestore().collection('users').doc(firebaseUser.uid).set(userData);
        console.log('✅ New Google user created');
      } else {
        // Update last login time for existing users
        await firestore().collection('users').doc(firebaseUser.uid).update({
          lastLoginAt: firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Existing Google user signed in');
      }

      // Fetch full user data
      const user = await this.getCurrentUserEntity();
      if (!user) {
        throw new Error('Failed to fetch user data after Google sign in');
      }

      return user;
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);

      // Handle specific Google Sign-In errors
      if (error.code === 'SIGN_IN_CANCELLED') {
        throw {
          code: 'auth/cancelled',
          message: 'Sign in was cancelled',
        };
      }

      if (error.code === 'IN_PROGRESS') {
        throw {
          code: 'auth/in-progress',
          message: 'Sign in already in progress',
        };
      }

      if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        throw {
          code: 'auth/play-services-unavailable',
          message: 'Google Play Services is not available',
        };
      }

      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with Apple (iOS only)
   */
  async signInWithApple(): Promise<User> {
    try {
      // Check if platform is iOS
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS');
      }

      console.log('🍎 Starting Apple Sign-In...');

      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In is not available on this device');
      }

      // Request Apple authentication
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Get Apple credential
      const { identityToken, fullName } = appleCredential;

      if (!identityToken) {
        throw new Error('Failed to get Apple identity token');
      }

      // Create Firebase credential
      const appleAuthProvider = new auth.OAuthProvider('apple.com');
      const credential = appleAuthProvider.credential({
        idToken: identityToken,
      });

      // Sign in to Firebase with Apple credential
      const userCredential = await this.auth.signInWithCredential(credential);
      const firebaseUser = userCredential.user;

      // Check if this is a new user
      const isNewUser = userCredential.additionalUserInfo?.isNewUser || false;

      if (isNewUser) {
        // For new users, use the name from Apple (if provided)
        const displayName = fullName
          ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim()
          : null;

        // Update Firebase profile with name
        if (displayName) {
          await firebaseUser.updateProfile({ displayName });
        }

        // Create user document in Firestore
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: displayName || null,
          photoURL: firebaseUser.photoURL || null,
          authProvider: 'apple' as AuthProvider,
          subscriptionTier: 'free' as SubscriptionTier,
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastLoginAt: firestore.FieldValue.serverTimestamp(),
          emailVerified: firebaseUser.emailVerified,
        };

        await firestore().collection('users').doc(firebaseUser.uid).set(userData);
        console.log('✅ New Apple user created');
      } else {
        // Update last login time for existing users
        await firestore().collection('users').doc(firebaseUser.uid).update({
          lastLoginAt: firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Existing Apple user signed in');
      }

      // Fetch full user data
      const user = await this.getCurrentUserEntity();
      if (!user) {
        throw new Error('Failed to fetch user data after Apple sign in');
      }

      return user;
    } catch (error: any) {
      console.error('❌ Apple Sign-In error:', error);

      // Handle specific Apple Sign-In errors
      if (error.code === 'ERR_CANCELED') {
        throw {
          code: 'auth/cancelled',
          message: 'Sign in was cancelled',
        };
      }

      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out from Google (if signed in with Google)
   */
  private async signOutFromGoogle(): Promise<void> {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        await GoogleSignin.signOut();
        console.log('✅ Signed out from Google');
      }
    } catch (error) {
      console.warn('⚠️ Error signing out from Google:', error);
      // Don't throw - Firebase sign out is more important
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      console.log('📧 Sending password reset email to:', email);
      await this.auth.sendPasswordResetEmail(email);
      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      const user = this.getCurrentUser();

      if (!user) {
        throw new Error('No user is currently signed in');
      }

      console.log('🔒 Updating password');
      await user.updatePassword(newPassword);
      console.log('✅ Password updated successfully');
    } catch (error: any) {
      console.error('❌ Update password error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(update: UserProfileUpdate): Promise<void> {
    try {
      const user = this.getCurrentUser();

      if (!user) {
        throw new Error('No user is currently signed in');
      }

      console.log('👤 Updating user profile');

      // Update Firebase Auth profile
      await user.updateProfile({
        displayName: update.displayName,
        photoURL: update.photoURL,
      });

      // Update Firestore document
      await firestore().collection('users').doc(user.uid).update({
        displayName: update.displayName || null,
        photoURL: update.photoURL || null,
      });

      console.log('✅ Profile updated successfully');
    } catch (error: any) {
      console.error('❌ Update profile error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Re-authenticate user (required for sensitive operations)
   */
  async reauthenticate(password: string): Promise<void> {
    try {
      const user = this.getCurrentUser();

      if (!user || !user.email) {
        throw new Error('No user is currently signed in');
      }

      console.log('🔐 Re-authenticating user');

      const credential = auth.EmailAuthProvider.credential(user.email, password);
      await user.reauthenticateWithCredential(credential);

      console.log('✅ Re-authentication successful');
    } catch (error: any) {
      console.error('❌ Re-authentication error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    try {
      const user = this.getCurrentUser();

      if (!user) {
        throw new Error('No user is currently signed in');
      }

      console.log('🗑️ Deleting user account');

      // Delete Firestore document
      await firestore().collection('users').doc(user.uid).delete();

      // Delete usage data
      const usageSnapshot = await firestore()
        .collection('usage')
        .where('userId', '==', user.uid)
        .get();

      const batch = firestore().batch();
      usageSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Delete Firebase Auth account
      await user.delete();

      console.log('✅ Account deleted successfully');
    } catch (error: any) {
      console.error('❌ Delete account error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(): Promise<void> {
    try {
      const user = this.getCurrentUser();

      if (!user) {
        throw new Error('No user is currently signed in');
      }

      console.log('📧 Sending email verification');
      await user.sendEmailVerification();
      console.log('✅ Verification email sent');
    } catch (error: any) {
      console.error('❌ Send verification error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Reload user data (to check email verification status)
   */
  async reloadUser(): Promise<void> {
    try {
      const user = this.getCurrentUser();

      if (!user) {
        throw new Error('No user is currently signed in');
      }

      await user.reload();

      // Update Firestore if email was verified
      if (user.emailVerified) {
        await firestore().collection('users').doc(user.uid).update({
          emailVerified: true,
        });
      }
    } catch (error: any) {
      console.error('❌ Reload user error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return this.auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.getCurrentUserEntity();
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Handle Firebase Auth errors and convert to user-friendly messages
   */
  private handleAuthError(error: any): AuthError {
    const errorCode = error.code || 'unknown';
    let message = error.message || 'An unknown error occurred';

    // Map Firebase error codes to user-friendly messages
    switch (errorCode) {
      case 'auth/email-already-in-use':
        message = 'This email is already registered. Please sign in instead.';
        break;
      case 'auth/invalid-email':
        message = 'Please enter a valid email address.';
        break;
      case 'auth/operation-not-allowed':
        message = 'Email/password authentication is not enabled.';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters long.';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled.';
        break;
      case 'auth/user-not-found':
        message = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password. Please try again.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection.';
        break;
      case 'auth/requires-recent-login':
        message = 'This operation requires recent authentication. Please sign in again.';
        break;
      default:
        message = error.message || 'An error occurred. Please try again.';
    }

    return {
      code: errorCode,
      message,
    };
  }
}

// Singleton instance
const firebaseAuthService = new FirebaseAuthService();

export default firebaseAuthService;
