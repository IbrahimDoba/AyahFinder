/**
 * Firebase Configuration
 * Initializes Firebase services for authentication, Firestore, and Cloud Functions
 */
import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { FIREBASE_CONFIG } from './src/constants/config';

/**
 * Initialize Firebase
 * This should be called once at app startup
 *
 * Note: Firebase is automatically initialized from:
 * - iOS: GoogleService-Info.plist
 * - Android: google-services.json
 *
 * These files should be downloaded from Firebase Console and added to:
 * - iOS: ios/AyahFinder/GoogleService-Info.plist
 * - Android: android/app/google-services.json
 */
export const initializeFirebase = () => {
  try {
    // Enable Firebase Emulator for local development (optional)
    if (FIREBASE_CONFIG.ENABLE_EMULATOR) {
      const { EMULATOR_HOST, AUTH_EMULATOR_PORT, FIRESTORE_EMULATOR_PORT, FUNCTIONS_EMULATOR_PORT } = FIREBASE_CONFIG;

      // Connect to emulators
      if (__DEV__) {
        console.log('🔧 Connecting to Firebase Emulators...');

        // Auth emulator
        const authUrl = Platform.select({
          ios: `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`,
          android: `http://10.0.2.2:${AUTH_EMULATOR_PORT}`, // Android emulator maps 10.0.2.2 to host
          default: `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`,
        });
        auth().useEmulator(authUrl);

        // Firestore emulator
        firestore().useEmulator(EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);

        // Functions emulator
        functions().useEmulator(EMULATOR_HOST, FUNCTIONS_EMULATOR_PORT);

        console.log('✅ Connected to Firebase Emulators');
      }
    }

    // Configure Firestore settings
    firestore().settings({
      cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
      persistence: true, // Enable offline persistence
    });

    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    throw error;
  }
};

/**
 * Firebase service instances
 * Export these to use throughout the app
 */
export const firebaseAuth = auth();
export const firebaseFirestore = firestore();
export const firebaseFunctions = functions();

/**
 * Helper to check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
  try {
    // Check if Firebase app is initialized
    const app = auth().app;
    return !!app;
  } catch (error) {
    console.warn('Firebase not configured:', error);
    return false;
  }
};

export default {
  initializeFirebase,
  auth: firebaseAuth,
  firestore: firebaseFirestore,
  functions: firebaseFunctions,
  isConfigured: isFirebaseConfigured,
};
