// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConfirmPasswordResetRequest {
  token: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  displayName?: string;
  subscriptionTier: 'free' | 'premium';
  emailVerified: boolean;
  createdAt: string;
}

export interface MessageResponse {
  message: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  errors?: any[];
}

// ============================================================================
// RECOGNITION TYPES
// ============================================================================

export interface RecognitionRequest {
  // Audio file will be in FormData
}

export interface RecognitionResponse {
  success: boolean;
  transcription: string;
  match?: {
    surahNumber: number;
    ayahNumber: number;
    confidence: number;
    explanation: string;
  };
  verse?: {
    arabicText: string;
    englishTranslation: string;
    surahName: string;
    surahNameArabic: string;
  };
  message?: string;
  processingTimeMs: number;
}

// ============================================================================
// USAGE TYPES
// ============================================================================

export interface UsageStatsResponse {
  used: number;
  remaining: number;
  limit: number;
  resetAt: string;
  subscriptionTier: 'free' | 'premium';
}

export interface ValidateUsageResponse {
  allowed: boolean;
  remaining: number;
  limit: number;
  reason?: string;
}

// ============================================================================
// QURAN TYPES
// ============================================================================

export interface Surah {
  number: number;
  name: string;
  nameArabic: string;
  translation: string;
  transliteration: string;
  type: string;
  totalVerses: number;
}

export interface Ayah {
  number: number;
  text: string;
  translation: string;
  surahNumber: number;
  surahName: string;
  surahNameArabic: string;
}

export interface SurahDetailResponse {
  surah: Surah;
  ayahs: Ayah[];
}

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

export interface SubscriptionStatusResponse {
  subscriptionTier: 'free' | 'premium';
  status?: 'active' | 'expired' | 'cancelled' | 'trial';
  expiresAt?: string;
  productId?: string;
}

export interface PaystackPaymentRequest {
  amount: number;
  email: string;
  planName: string;
}

export interface PaystackPaymentResponse {
  authorizationUrl: string;
  reference: string;
}

export interface PaystackVerifyRequest {
  reference: string;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface RevenueCatWebhookEvent {
  type: string;
  app_user_id: string;
  product_id: string;
  expires_date_ms?: number;
  subscriber_attributes?: {
    customer_id?: string;
  };
}

export interface PaystackWebhookEvent {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    customer: {
      email: string;
      customer_code?: string;
    };
  };
}
