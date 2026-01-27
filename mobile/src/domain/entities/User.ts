/**
 * User Domain Entity
 * Represents an authenticated user in the system
 */

export type AuthProvider = 'email' | 'google' | 'apple';
export type SubscriptionTier = 'free' | 'premium';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  authProvider: AuthProvider;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
  lastLoginAt: Date;
  emailVerified: boolean;
}

/**
 * Create a User entity from Firebase Auth user data
 */
export function createUserFromFirebase(
  firebaseUser: any,
  authProvider: AuthProvider,
  subscriptionTier: SubscriptionTier = 'free'
): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || undefined,
    photoURL: firebaseUser.photoURL || undefined,
    authProvider,
    subscriptionTier,
    createdAt: firebaseUser.metadata?.creationTime
      ? new Date(firebaseUser.metadata.creationTime)
      : new Date(),
    lastLoginAt: firebaseUser.metadata?.lastSignInTime
      ? new Date(firebaseUser.metadata.lastSignInTime)
      : new Date(),
    emailVerified: firebaseUser.emailVerified || false,
  };
}

/**
 * User profile data for updates
 */
export interface UserProfileUpdate {
  displayName?: string;
  photoURL?: string;
}

/**
 * User credentials for authentication
 */
export interface UserCredentials {
  email: string;
  password: string;
}

/**
 * User registration data
 */
export interface UserRegistration extends UserCredentials {
  displayName?: string;
}
