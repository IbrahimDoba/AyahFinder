// ============================================================================
// USAGE LIMITS
// ============================================================================

export const USAGE_LIMITS = {
  ANONYMOUS: {
    DAILY_SEARCHES: 2,
  },
  FREE: {
    DAILY_SEARCHES: 5,
  },
  PREMIUM: {
    MONTHLY_SEARCHES: 100,
  },
} as const;

// ============================================================================
// TOKEN EXPIRY
// ============================================================================

export const TOKEN_EXPIRY = {
  VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 1 * 60 * 60 * 1000, // 1 hour
} as const;

// ============================================================================
// AUDIO CONFIG
// ============================================================================

export const AUDIO_CONFIG = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_FORMATS: ['audio/m4a', 'audio/wav', 'audio/mp3', 'audio/mpeg'],
  MAX_DURATION_SECONDS: 15,
} as const;

// ============================================================================
// RATE LIMITING
// ============================================================================

export const RATE_LIMITS = {
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5, // 5 attempts per 15 minutes
  },
  API: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // 100 requests per 15 minutes
  },
  RECOGNITION: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 10, // 10 recognition requests per minute
  },
} as const;

// ============================================================================
// OPENAI CONFIG
// ============================================================================

export const OPENAI_CONFIG = {
  WHISPER_MODEL: 'whisper-1',
  GPT_MODEL: 'gpt-4o-mini',
  TEMPERATURE: 0.3,
  MAX_TOKENS: 500,
  CONFIDENCE_THRESHOLD: 30, // Minimum confidence to accept match
} as const;

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export const EMAIL_SUBJECTS = {
  VERIFICATION: 'Verify Your Email - AyahFind',
  PASSWORD_RESET: 'Reset Your Password - AyahFind',
  WELCOME: 'Welcome to AyahFind!',
} as const;

// ============================================================================
// SUBSCRIPTION CONFIG
// ============================================================================

export const SUBSCRIPTION_CONFIG = {
  PREMIUM_MONTHLY: {
    PRODUCT_ID: 'premium_monthly',
    DURATION_DAYS: 30,
  },
  PREMIUM_YEARLY: {
    PRODUCT_ID: 'premium_yearly',
    DURATION_DAYS: 365,
  },
} as const;

// ============================================================================
// DATABASE CONFIG
// ============================================================================

export const DB_CONFIG = {
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  QUERY_TIMEOUT: 30000, // 30 seconds
} as const;

// ============================================================================
// VALIDATION REGEX
// ============================================================================

export const VALIDATION_REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
} as const;

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
