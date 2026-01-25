# Ayahfinder - Technical Architecture

## Technology Stack Overview

### Mobile Application
| Component | Technology | Justification |
|-----------|------------|---------------|
| Framework | React Native + Expo | Cross-platform, fast iteration, HeroUI compatibility |
| Language | TypeScript | Type safety, better DX, reduced runtime errors |
| UI Library | HeroUI | Modern, accessible components, clean design |
| State Management | Zustand | Lightweight, simple API, good TypeScript support |
| Navigation | React Navigation | Industry standard, performant, well-documented |
| Audio | expo-av | Native audio recording, cross-platform |
| HTTP Client | Axios | Interceptors, retry logic, widespread adoption |

### Backend Services
| Component | Technology | Justification |
|-----------|------------|---------------|
| API Gateway | Node.js + Express | Fast, familiar, good for routing/auth |
| ML Service | Python + FastAPI | ML ecosystem, async support, auto-docs |
| Fingerprinting | Chromaprint + librosa | Proven audio fingerprinting, flexible |
| Vector Search | Pinecone | Purpose-built for similarity search, managed |
| Database | PostgreSQL | Reliable, full-featured, excellent for Quran data |
| Cache | Redis | Fast, versatile, session management |
| File Storage | AWS S3 | Scalable, cost-effective audio storage |

### Infrastructure
| Component | Technology | Justification |
|-----------|------------|---------------|
| Container | Docker | Consistent environments, easy deployment |
| Orchestration | Kubernetes (EKS) | Auto-scaling, high availability |
| CI/CD | GitHub Actions | Integrated with repo, free for open source |
| Monitoring | Sentry + Datadog | Error tracking + performance monitoring |
| CDN | CloudFront | Low latency asset delivery |

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MOBILE APPLICATION                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ Presentation │  │   Domain    │  │    Data     │                 │
│  │    Layer    │──│    Layer    │──│    Layer    │                 │
│  │  (Screens,  │  │ (Use Cases, │  │(Repositories,│                 │
│  │ Components) │  │  Entities)  │  │ DataSources)│                 │
│  └─────────────┘  └─────────────┘  └──────┬──────┘                 │
└────────────────────────────────────────────┼────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │   Auth   │  │  Quran   │  │Recognition│  │  Cache   │            │
│  │ Middleware│  │  Routes  │  │  Routes  │  │ Layer    │            │
│  └──────────┘  └──────────┘  └────┬─────┘  └──────────┘            │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │  PostgreSQL  │ │  ML Service  │ │    Redis     │
            │  (Quran DB)  │ │  (FastAPI)   │ │   (Cache)    │
            └──────────────┘ └──────┬───────┘ └──────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │   Pinecone   │ │   AWS S3     │ │  Chromaprint │
            │(Vector Store)│ │(Audio Files) │ │  + librosa   │
            └──────────────┘ └──────────────┘ └──────────────┘
```

---

## Clean Architecture - Mobile App

### Folder Structure
```
mobile/src/
├── presentation/           # UI Layer
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── QuranListScreen.tsx
│   │   ├── SurahScreen.tsx
│   │   └── ResultScreen.tsx
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Text.tsx
│   │   ├── quran/
│   │   │   ├── AyahText.tsx
│   │   │   ├── SurahCard.tsx
│   │   │   └── VerseHighlight.tsx
│   │   └── recognition/
│   │       ├── ListenButton.tsx
│   │       ├── PulseAnimation.tsx
│   │       └── ResultCard.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   └── QuranNavigator.tsx
│   ├── hooks/
│   │   ├── useAudioRecorder.ts
│   │   ├── useRecognition.ts
│   │   └── useQuranData.ts
│   └── store/
│       ├── recognitionStore.ts
│       ├── quranStore.ts
│       └── settingsStore.ts
│
├── domain/                 # Business Logic Layer
│   ├── entities/
│   │   ├── Surah.ts
│   │   ├── Ayah.ts
│   │   └── RecognitionResult.ts
│   ├── usecases/
│   │   ├── RecognizeAudioUseCase.ts
│   │   ├── GetSurahsUseCase.ts
│   │   ├── GetAyahsUseCase.ts
│   │   └── ResolveAmbiguousMatchUseCase.ts
│   └── repositories/
│       ├── IQuranRepository.ts
│       └── IRecognitionRepository.ts
│
├── data/                   # Data Layer
│   ├── repositories/
│   │   ├── QuranRepositoryImpl.ts
│   │   └── RecognitionRepositoryImpl.ts
│   ├── datasources/
│   │   ├── remote/
│   │   │   ├── QuranApiDataSource.ts
│   │   │   └── RecognitionApiDataSource.ts
│   │   └── local/
│   │       └── QuranLocalDataSource.ts
│   └── models/
│       ├── SurahDTO.ts
│       ├── AyahDTO.ts
│       └── RecognitionResponseDTO.ts
│
├── services/               # External Services
│   ├── audio/
│   │   ├── AudioRecorder.ts
│   │   ├── AudioProcessor.ts
│   │   └── AudioUploader.ts
│   ├── api/
│   │   ├── apiClient.ts
│   │   └── endpoints.ts
│   └── analytics/
│       └── AnalyticsService.ts
│
├── utils/                  # Utilities
│   ├── errorHandler.ts
│   ├── formatters.ts
│   └── validators.ts
│
└── constants/              # App Constants
    ├── colors.ts
    ├── typography.ts
    ├── config.ts
    └── errorMessages.ts
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Screens | PascalCase + Screen | `HomeScreen.tsx` |
| Components | PascalCase | `ListenButton.tsx` |
| Hooks | camelCase + use prefix | `useAudioRecorder.ts` |
| Use Cases | PascalCase + UseCase | `RecognizeAudioUseCase.ts` |
| Repositories | Interface: I + Name | `IQuranRepository.ts` |
| Repositories | Impl: Name + Impl | `QuranRepositoryImpl.ts` |
| DTOs | PascalCase + DTO | `SurahDTO.ts` |
| Stores | camelCase + Store | `quranStore.ts` |
| Utils | camelCase | `formatters.ts` |

---

## Backend Architecture

### API Gateway (Node.js)
```
backend/api-gateway/
├── src/
│   ├── routes/
│   │   ├── quran.routes.ts
│   │   ├── recognition.routes.ts
│   │   └── health.routes.ts
│   ├── controllers/
│   │   ├── quran.controller.ts
│   │   └── recognition.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rateLimiter.middleware.ts
│   │   ├── cache.middleware.ts
│   │   └── errorHandler.middleware.ts
│   ├── services/
│   │   ├── quran.service.ts
│   │   ├── mlClient.service.ts
│   │   └── cache.service.ts
│   ├── models/
│   │   ├── surah.model.ts
│   │   └── ayah.model.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── env.ts
│   └── utils/
│       ├── logger.ts
│       └── validators.ts
├── tests/
├── Dockerfile
└── package.json
```

### ML Service (Python/FastAPI)
```
backend/ml-service/
├── src/
│   ├── api/
│   │   ├── routes.py
│   │   └── dependencies.py
│   ├── core/
│   │   ├── config.py
│   │   └── security.py
│   ├── fingerprint/
│   │   ├── generator.py
│   │   ├── matcher.py
│   │   ├── preprocessor.py
│   │   └── sequence_matcher.py
│   ├── models/
│   │   ├── fingerprint.py
│   │   ├── match_result.py
│   │   └── audio_request.py
│   ├── services/
│   │   ├── audio_service.py
│   │   ├── matching_service.py
│   │   └── pinecone_service.py
│   └── utils/
│       ├── audio_utils.py
│       └── logging.py
├── tests/
├── requirements.txt
├── Dockerfile
└── main.py
```

---

## State Management (Zustand)

### Recognition Store
```typescript
// src/presentation/store/recognitionStore.ts
interface RecognitionState {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  result: RecognitionResult | null;
  error: string | null;

  // Actions
  startRecording: () => void;
  stopRecording: () => void;
  setResult: (result: RecognitionResult) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useRecognitionStore = create<RecognitionState>((set) => ({
  isRecording: false,
  isProcessing: false,
  result: null,
  error: null,

  startRecording: () => set({ isRecording: true, error: null }),
  stopRecording: () => set({ isRecording: false, isProcessing: true }),
  setResult: (result) => set({ result, isProcessing: false }),
  setError: (error) => set({ error, isProcessing: false }),
  reset: () => set({ isRecording: false, isProcessing: false, result: null, error: null }),
}));
```

### Quran Store
```typescript
// src/presentation/store/quranStore.ts
interface QuranState {
  surahs: Surah[];
  currentSurah: Surah | null;
  ayahs: Ayah[];
  highlightedAyah: number | null;
  isLoading: boolean;

  setSurahs: (surahs: Surah[]) => void;
  setCurrentSurah: (surah: Surah) => void;
  setAyahs: (ayahs: Ayah[]) => void;
  highlightAyah: (ayahNumber: number) => void;
  clearHighlight: () => void;
}
```

---

## API Endpoints

### Quran Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/surahs` | List all Surahs |
| GET | `/api/surahs/:id` | Get Surah details |
| GET | `/api/surahs/:id/ayahs` | Get Ayahs of a Surah |
| GET | `/api/ayahs/:id` | Get single Ayah |
| GET | `/api/search?q=` | Search Quran text |

### Recognition Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recognize` | Submit audio for recognition |
| POST | `/api/recognize/continue` | Continue listening for ambiguous match |
| GET | `/api/recognize/status/:id` | Check recognition job status |

### Health Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health check |
| GET | `/health/ml` | ML service health |
| GET | `/health/db` | Database health |

---

## Audio Processing Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Record    │───▶│  Compress   │───▶│   Upload    │───▶│   Process   │
│   (16kHz)   │    │   (FLAC)    │    │   (HTTP)    │    │  (Backend)  │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────▼──────┐
│   Return    │◀───│    Score    │◀───│    Match    │◀───│ Fingerprint │
│   Result    │    │  Candidates │    │  (Pinecone) │    │  Generate   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Audio Configuration
```typescript
const AUDIO_CONFIG = {
  recording: {
    sampleRate: 16000,        // 16kHz for speech
    channels: 1,              // Mono
    bitsPerSample: 16,        // 16-bit
    format: 'wav',
  },
  compression: {
    format: 'flac',           // Lossless compression
    targetBitrate: 128000,    // ~128kbps
  },
  limits: {
    minDuration: 3000,        // 3 seconds minimum
    maxDuration: 15000,       // 15 seconds maximum
    maxFileSize: 2 * 1024 * 1024, // 2MB max
  },
};
```

---

## Security Considerations

### API Security
- Rate limiting: 60 requests/minute per IP
- Request size limit: 5MB for audio uploads
- Input validation on all endpoints
- HTTPS only in production

### Audio Data
- Audio files deleted after processing (not stored permanently)
- No PII in audio metadata
- Temporary files cleaned up within 1 hour

### Mobile App
- Certificate pinning for API requests
- Secure storage for any tokens
- No sensitive data in logs

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold start (app) | < 2s | App launch to interactive |
| Recording start | < 100ms | Button tap to recording |
| Recognition | < 3s | Audio submit to result |
| Quran load | < 500ms | Surah list render |
| Scroll performance | 60fps | Smooth Ayah scrolling |
