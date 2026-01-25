# Ayahfinder - Engineering Best Practices

## Overview

This document outlines engineering standards for error handling, logging, testing, performance, and security.

---

## Error Handling Strategy

### Error Classification

| Category | HTTP Code | Retry | User Message |
|----------|-----------|-------|--------------|
| Validation | 400 | No | Specific field error |
| Authentication | 401 | No | Please sign in |
| Not Found | 404 | No | Resource not found |
| Rate Limited | 429 | Yes (backoff) | Too many requests |
| Server Error | 500 | Yes (3x) | Something went wrong |
| Service Unavailable | 503 | Yes (backoff) | Service temporarily unavailable |

### Backend Error Handling

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class RecognitionError extends AppError {
  constructor(reason: string) {
    super(422, 'RECOGNITION_FAILED', reason);
  }
}

// Middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    logger.warn('Operational error', {
      code: err.code,
      message: err.message,
      path: req.path,
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        field: (err as ValidationError).field,
      },
    });
  }

  // Unexpected error
  logger.error('Unexpected error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
```

### Mobile Error Handling

```typescript
// src/utils/errorHandler.ts
export type ErrorType =
  | 'NETWORK'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'RECOGNITION'
  | 'PERMISSION'
  | 'UNKNOWN';

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  retryable: boolean;
}

export function parseApiError(error: AxiosError): AppError {
  if (!error.response) {
    return {
      type: 'NETWORK',
      message: 'Unable to connect. Please check your internet.',
      retryable: true,
    };
  }

  const { status, data } = error.response;

  switch (status) {
    case 400:
      return {
        type: 'VALIDATION',
        message: data.error?.message || 'Invalid request',
        code: data.error?.code,
        retryable: false,
      };
    case 404:
      return {
        type: 'NOT_FOUND',
        message: 'Resource not found',
        retryable: false,
      };
    case 422:
      return {
        type: 'RECOGNITION',
        message: data.error?.message || 'Could not recognize audio',
        retryable: true,
      };
    case 429:
      return {
        type: 'NETWORK',
        message: 'Too many requests. Please wait.',
        retryable: true,
      };
    default:
      return {
        type: 'UNKNOWN',
        message: 'Something went wrong',
        retryable: true,
      };
  }
}

// Error boundary component
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryComponent
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} onRetry={resetError} />
      )}
    >
      {children}
    </ErrorBoundaryComponent>
  );
}
```

### Retry Logic

```typescript
// src/services/api/retryClient.ts
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  config = DEFAULT_CONFIG
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!shouldRetry(error, config)) {
        throw error;
      }

      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff with jitter
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}
```

---

## Logging & Monitoring

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| ERROR | Unexpected failures | Database connection failed |
| WARN | Handled issues | Rate limit approached |
| INFO | Business events | Recognition completed |
| DEBUG | Development | Query parameters |

### Backend Logging

```typescript
// src/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: process.env.NODE_ENV !== 'production',
    },
  },
  base: {
    service: 'ayahfinder-api',
    version: process.env.APP_VERSION,
  },
  redact: ['req.headers.authorization', 'audio_data'],
});

// Structured logging examples
logger.info({
  event: 'recognition_completed',
  surah: 1,
  ayah: 1,
  confidence: 0.95,
  duration_ms: 1250,
});

logger.warn({
  event: 'low_confidence_match',
  confidence: 0.65,
  candidates: 3,
});

logger.error({
  event: 'fingerprint_generation_failed',
  error: error.message,
  audio_size: audioBuffer.length,
});
```

### Request Logging Middleware

```typescript
// src/middleware/requestLogger.ts
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info({
      event: 'http_request',
      request_id: requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      user_agent: req.headers['user-agent'],
    });
  });

  next();
}
```

### Monitoring & Alerting

```typescript
// src/services/monitoring.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of transactions
  beforeSend(event) {
    // Don't send expected operational errors
    if (event.extra?.isOperational) {
      return null;
    }
    return event;
  },
});

// Custom metrics
import { StatsD } from 'hot-shots';

const statsd = new StatsD({
  host: process.env.STATSD_HOST,
  prefix: 'ayahfinder.',
});

export const metrics = {
  recordRecognition(duration: number, success: boolean) {
    statsd.timing('recognition.duration', duration);
    statsd.increment(success ? 'recognition.success' : 'recognition.failure');
  },

  recordConfidence(confidence: number) {
    statsd.histogram('recognition.confidence', confidence);
  },

  recordApiLatency(endpoint: string, duration: number) {
    statsd.timing(`api.${endpoint}.latency`, duration);
  },
};
```

### Alert Rules

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Error rate | > 5% | PagerDuty |
| P95 latency | > 5s | Slack |
| Recognition success | < 80% | Slack |
| CPU usage | > 80% | Auto-scale |
| Memory usage | > 85% | PagerDuty |

---

## Testing Strategy

### Test Pyramid

```
                    ┌─────────┐
                    │   E2E   │  < 5% (Critical flows)
                    ├─────────┤
              ┌─────┴─────────┴─────┐
              │   Integration       │  20% (API, DB)
              ├─────────────────────┤
        ┌─────┴─────────────────────┴─────┐
        │          Unit Tests              │  75% (Logic)
        └─────────────────────────────────┘
```

### Unit Tests

```typescript
// __tests__/unit/usecases/RecognizeAudioUseCase.test.ts
import { RecognizeAudioUseCase } from '@/domain/usecases/RecognizeAudioUseCase';

describe('RecognizeAudioUseCase', () => {
  let useCase: RecognizeAudioUseCase;
  let mockRepository: jest.Mocked<IRecognitionRepository>;

  beforeEach(() => {
    mockRepository = {
      recognize: jest.fn(),
    };
    useCase = new RecognizeAudioUseCase(mockRepository);
  });

  it('should return recognition result for valid audio', async () => {
    const mockResult = {
      success: true,
      surah: { number: 1, nameArabic: 'الفاتحة' },
      ayah: { number: 1, textArabic: 'بسم الله...' },
      confidence: 0.95,
    };
    mockRepository.recognize.mockResolvedValue(mockResult);

    const result = await useCase.execute(mockAudioBuffer);

    expect(result.success).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should handle no match gracefully', async () => {
    mockRepository.recognize.mockResolvedValue({
      success: false,
      reason: 'no_match',
    });

    const result = await useCase.execute(mockAudioBuffer);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('no_match');
  });

  it('should throw for empty audio', async () => {
    await expect(useCase.execute(new ArrayBuffer(0)))
      .rejects.toThrow('Audio buffer is empty');
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/recognition.test.ts
import request from 'supertest';
import { app } from '@/app';
import { db } from '@/config/database';

describe('Recognition API', () => {
  beforeAll(async () => {
    await db.connect();
    await seedTestData();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it('POST /api/recognize returns match for valid audio', async () => {
    const audioFile = await loadTestAudio('fatiha_1.wav');

    const response = await request(app)
      .post('/api/recognize')
      .attach('audio', audioFile)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.result.surah.number).toBe(1);
    expect(response.body.result.ayah.ayahNumber).toBe(1);
  });

  it('POST /api/recognize handles no match', async () => {
    const audioFile = await loadTestAudio('random_audio.wav');

    const response = await request(app)
      .post('/api/recognize')
      .attach('audio', audioFile)
      .expect(200);

    expect(response.body.success).toBe(false);
  });

  it('rejects audio over size limit', async () => {
    const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB

    const response = await request(app)
      .post('/api/recognize')
      .attach('audio', largeFile, 'large.wav')
      .expect(400);

    expect(response.body.error.code).toBe('FILE_TOO_LARGE');
  });
});
```

### E2E Tests (Detox)

```typescript
// e2e/recognition.e2e.ts
describe('Recognition Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete full recognition flow', async () => {
    // Navigate to home
    await expect(element(by.id('listen-button'))).toBeVisible();

    // Simulate audio (using mock)
    await element(by.id('listen-button')).tap();

    // Wait for processing
    await waitFor(element(by.id('result-screen')))
      .toBeVisible()
      .withTimeout(10000);

    // Verify result
    await expect(element(by.id('surah-name'))).toHaveText('الفاتحة');
    await expect(element(by.id('ayah-number'))).toHaveText('Ayah 1');
  });

  it('should navigate to Quran reader', async () => {
    await element(by.id('quran-tab')).tap();
    await expect(element(by.id('surah-list'))).toBeVisible();

    await element(by.text('الفاتحة')).tap();
    await expect(element(by.id('ayah-1'))).toBeVisible();
  });
});
```

### Test Coverage Targets

| Component | Coverage Target |
|-----------|-----------------|
| Domain (use cases) | 90% |
| Data (repositories) | 80% |
| Services | 85% |
| API routes | 80% |
| UI components | 70% |
| **Overall** | **80%** |

---

## Performance Considerations

### Mobile Performance

```typescript
// Performance optimizations

// 1. Memoize expensive renders
const SurahList = React.memo(function SurahList({ surahs }) {
  return (
    <FlatList
      data={surahs}
      renderItem={({ item }) => <SurahCard surah={item} />}
      keyExtractor={(item) => item.id.toString()}
      getItemLayout={(_, index) => ({
        length: SURAH_CARD_HEIGHT,
        offset: SURAH_CARD_HEIGHT * index,
        index,
      })}
      windowSize={10}
      maxToRenderPerBatch={10}
      initialNumToRender={15}
    />
  );
});

// 2. Lazy load heavy components
const QuranReader = React.lazy(() => import('./QuranReader'));

// 3. Use InteractionManager for heavy operations
InteractionManager.runAfterInteractions(() => {
  // Heavy computation here
  generateFingerprint(audioBuffer);
});

// 4. Optimize images
<Image
  source={{ uri: imageUrl }}
  style={styles.image}
  resizeMode="cover"
  fadeDuration={0}
/>
```

### Backend Performance

```typescript
// 1. Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 2. Query optimization
const getSurahWithAyahs = `
  SELECT
    s.*,
    json_agg(a ORDER BY a.ayah_number) as ayahs
  FROM surahs s
  LEFT JOIN ayahs a ON a.surah_id = s.id
  WHERE s.number = $1
  GROUP BY s.id
`;

// 3. Streaming for large responses
app.get('/api/surahs/:id/ayahs', async (req, res) => {
  const cursor = db.query(
    'SELECT * FROM ayahs WHERE surah_id = $1 ORDER BY ayah_number',
    [req.params.id]
  );

  res.setHeader('Content-Type', 'application/json');
  res.write('[');

  let first = true;
  for await (const row of cursor) {
    if (!first) res.write(',');
    res.write(JSON.stringify(row));
    first = false;
  }

  res.write(']');
  res.end();
});

// 4. Compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024,
}));
```

### Performance Monitoring

```typescript
// src/middleware/performance.ts
export function performanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = process.hrtime();

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1e6;

    metrics.recordApiLatency(req.path, duration);

    // Log slow requests
    if (duration > 1000) {
      logger.warn({
        event: 'slow_request',
        path: req.path,
        method: req.method,
        duration_ms: duration,
      });
    }
  });

  next();
}
```

---

## Security & Privacy

### Audio Data Handling

```typescript
// Security principles for audio data

// 1. Never store audio permanently
class AudioProcessor {
  async processAudio(audio: Buffer): Promise<RecognitionResult> {
    try {
      const result = await this.recognize(audio);
      return result;
    } finally {
      // Always clean up
      audio.fill(0); // Overwrite buffer
    }
  }
}

// 2. Secure temporary storage
const TEMP_DIR = '/tmp/ayahfinder';
const TEMP_TTL = 5 * 60 * 1000; // 5 minutes

async function saveTempAudio(audio: Buffer): Promise<string> {
  const filename = `${crypto.randomUUID()}.wav`;
  const filepath = path.join(TEMP_DIR, filename);

  await fs.writeFile(filepath, audio);

  // Schedule deletion
  setTimeout(() => {
    fs.unlink(filepath).catch(() => {});
  }, TEMP_TTL);

  return filepath;
}

// 3. No audio in logs
logger.info({
  event: 'audio_received',
  size_bytes: audio.length,
  duration_ms: audioDuration,
  // NEVER log audio content or fingerprints
});
```

### API Security

```typescript
// src/middleware/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests',
    },
  },
});
app.use('/api/', limiter);

// Stricter limit for recognition
const recognitionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 recognitions per minute
});
app.use('/api/recognize', recognitionLimiter);

// Request size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.raw({
  type: 'audio/*',
  limit: '5mb',
}));

// Input validation
import { z } from 'zod';

const recognitionSchema = z.object({
  duration: z.number().min(1000).max(30000),
  format: z.enum(['wav', 'mp3', 'flac']),
});

app.post('/api/recognize', (req, res, next) => {
  try {
    recognitionSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
      },
    });
  }
});
```

### Mobile Security

```typescript
// src/services/security.ts

// 1. Certificate pinning
import { TrustKit } from 'react-native-trustkit';

TrustKit.initializeWithConfiguration({
  'ayahfinder.com': {
    TSKIncludeSubdomains: true,
    TSKPublicKeyHashes: [
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
    ],
  },
});

// 2. Secure storage for tokens
import * as SecureStore from 'expo-secure-store';

async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync('auth_token', token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

// 3. No sensitive data in logs
if (__DEV__) {
  console.log('Recognition result:', result.surah.nameEnglish);
} else {
  // Production: use structured logging
  analytics.track('recognition_complete', {
    surah_number: result.surah.number,
  });
}
```

### Privacy Policy Requirements

| Data | Collected | Stored | Purpose |
|------|-----------|--------|---------|
| Audio | Temporarily | Never | Recognition only |
| Recognition results | Yes | Optional (history) | User feature |
| Device info | Minimal | No | Debugging |
| Location | Never | Never | Not needed |
| Personal info | Never | Never | Not needed |

---

## Code Quality Standards

### Linting & Formatting

```json
// .eslintrc.js
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "react-hooks/exhaustive-deps": "error"
  }
}
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 80
}
```

### Git Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>

Types: feat, fix, docs, style, refactor, test, chore
Scope: recognition, quran, api, ui, etc.

Examples:
feat(recognition): add sequence-based matching
fix(api): handle missing audio gracefully
docs(readme): add setup instructions
```

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Error handling complete
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Accessibility checked (if UI)
