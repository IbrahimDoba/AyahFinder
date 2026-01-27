/**
 * Social Authentication Configuration
 *
 * IMPORTANT: Follow SOCIAL_AUTH_SETUP.md to get these credentials
 *
 * Credentials are loaded from .env file via react-native-dotenv
 * See .env.example for required environment variables
 */
import { GOOGLE_WEB_CLIENT_ID } from '@env';

export const SOCIAL_AUTH_CONFIG = {
  google: {
    // Web Client ID from Google Cloud Console
    // This is required for Google Sign-In to work with Firebase
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
  },
  apple: {
    // Apple Sign-In configuration is handled by Firebase
    // No additional config needed here
  },
};

/**
 * Check if social auth is properly configured
 */
export const isSocialAuthConfigured = () => {
  const isGoogleConfigured = Boolean(
    SOCIAL_AUTH_CONFIG.google.webClientId &&
    SOCIAL_AUTH_CONFIG.google.webClientId.includes('apps.googleusercontent.com')
  );
  return {
    google: isGoogleConfigured,
    apple: true, // Apple is always ready if Firebase is configured
  };
};
