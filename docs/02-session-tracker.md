# Ayahfinder - Session-by-Session Development Tracker

This document provides a detailed, step-by-step execution plan. Each session is designed to be completed in a focused work period (4-8 hours).

---

## Session 1: Project Setup & Architecture Foundation ✅

**Status**: Completed
**Date**: 2026-01-17

### Goals
- Initialize project repository with proper structure
- Set up development environment
- Establish coding standards and tooling

### Tasks
- [x] Initialize React Native project with Expo
- [x] Set up TypeScript configuration
- [x] Configure ESLint, Prettier
- [x] Create folder structure following Clean Architecture
- [x] Set up path aliases for imports
- [ ] Initialize backend project (Node.js + FastAPI) - Deferred to Phase 2
- [ ] Configure Docker for local development - Deferred to Phase 2

### Files/Components to Create
```
/mobile
  /src
    /presentation
      /screens
      /components
      /navigation
      /hooks
    /domain
      /entities
      /usecases
      /repositories (interfaces)
    /data
      /repositories (implementations)
      /datasources
      /models
    /services
      /audio
      /api
    /utils
    /constants
  app.json
  tsconfig.json
  .eslintrc.js
  .prettierrc

/backend
  /api-gateway (Node.js)
  /ml-service (Python/FastAPI)
  /shared
  docker-compose.yml
```

### Expected Outcome
- Running development environment
- Empty but properly structured project
- CI/CD pipeline skeleton

---

## Session 2: Quran Data Modeling & Database Setup

### Goals
- Design database schema for Quran text
- Import Quran data (Arabic text, translations)
- Create data access layer

### Tasks
1. Design PostgreSQL schema for Surahs and Ayahs
2. Create migration files
3. Source Quran text data (tanzil.net or similar)
4. Write data import scripts
5. Implement repository pattern for Quran data
6. Create API endpoints for Surah/Ayah retrieval
7. Write unit tests for data layer

### Files/Components to Create
```
/backend/api-gateway
  /src
    /models
      surah.model.ts
      ayah.model.ts
    /repositories
      quran.repository.ts
    /routes
      quran.routes.ts
    /controllers
      quran.controller.ts

/mobile/src
  /domain/entities
    Surah.ts
    Ayah.ts
  /data/models
    SurahDTO.ts
    AyahDTO.ts
  /data/repositories
    QuranRepositoryImpl.ts
```

### Database Schema
```sql
CREATE TABLE surahs (
  id SERIAL PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  name_arabic VARCHAR(100) NOT NULL,
  name_english VARCHAR(100) NOT NULL,
  name_transliteration VARCHAR(100),
  revelation_type VARCHAR(20),
  ayah_count INTEGER NOT NULL
);

CREATE TABLE ayahs (
  id SERIAL PRIMARY KEY,
  surah_id INTEGER REFERENCES surahs(id),
  ayah_number INTEGER NOT NULL,
  text_arabic TEXT NOT NULL,
  text_uthmani TEXT,
  juz_number INTEGER,
  page_number INTEGER,
  UNIQUE(surah_id, ayah_number)
);

CREATE INDEX idx_ayahs_surah ON ayahs(surah_id);
```

### Expected Outcome
- Populated database with all 6,236 Ayahs
- Working API to retrieve Quran text
- Mobile app can fetch and display Surahs

---

## Session 3: Audio Capture Pipeline

### Goals
- Implement audio recording on mobile
- Create audio preprocessing pipeline
- Set up audio upload flow

### Tasks
1. Install and configure expo-av for audio recording
2. Create AudioRecorder service class
3. Implement recording UI with pulse animation
4. Configure audio format (WAV, 16kHz, mono)
5. Create audio compression utility
6. Implement upload to backend
7. Handle permissions and error states

### Files/Components to Create
```
/mobile/src
  /services/audio
    AudioRecorder.ts
    AudioProcessor.ts
    AudioUploader.ts
  /presentation/components
    ListenButton.tsx
    PulseAnimation.tsx
  /presentation/hooks
    useAudioRecorder.ts
```

### Audio Configuration
```typescript
const AUDIO_CONFIG = {
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 128000,
  format: 'wav',
  maxDuration: 15000, // 15 seconds max
  minDuration: 3000,  // 3 seconds min
};
```

### Expected Outcome
- User can tap button and record audio
- Audio is captured in correct format
- File is uploaded to backend successfully
- Visual feedback during recording

---

## Session 4: Audio Fingerprinting Service

### Goals
- Implement audio fingerprinting algorithm
- Create fingerprint database structure
- Build matching service

### Tasks
1. Set up Chromaprint library in Python service
2. Create audio fingerprint generator
3. Design fingerprint storage schema
4. Implement fingerprint indexing with Pinecone
5. Create matching algorithm
6. Generate fingerprints for sample recitations
7. Write integration tests

### Files/Components to Create
```
/backend/ml-service
  /src
    /fingerprint
      generator.py
      matcher.py
      preprocessor.py
    /models
      fingerprint.py
      match_result.py
    /services
      audio_service.py
      matching_service.py
    /utils
      audio_utils.py
  requirements.txt
```

### Fingerprint Process
```python
# Fingerprint generation flow
1. Load audio file
2. Convert to mono 16kHz
3. Apply noise reduction
4. Generate Chromaprint fingerprint
5. Create embedding vector (128-dimensional)
6. Store in vector database with metadata
```

### Expected Outcome
- Fingerprints generated for test recitations
- Matching service returns correct Ayah for test inputs
- < 2 second processing time per query

---

## Session 5: Recognition Flow Integration

### Goals
- Connect mobile app to recognition backend
- Implement end-to-end recognition flow
- Display results with navigation

### Tasks
1. Create recognition API endpoint
2. Implement API client in mobile app
3. Create recognition state management
4. Build result display screen
5. Implement navigation to detected Ayah
6. Add loading and error states
7. End-to-end testing

### Files/Components to Create
```
/mobile/src
  /domain/usecases
    RecognizeAudioUseCase.ts
  /data/datasources
    RecognitionApiDataSource.ts
  /presentation/screens
    HomeScreen.tsx
    ResultScreen.tsx
  /presentation/components
    RecognitionResult.tsx
    LoadingOverlay.tsx
    ErrorMessage.tsx

/backend/api-gateway
  /src/routes
    recognition.routes.ts
  /src/controllers
    recognition.controller.ts
```

### API Contract
```typescript
// POST /api/recognize
// Request: multipart/form-data with audio file
// Response:
{
  success: boolean;
  result: {
    surah: {
      number: number;
      name_arabic: string;
      name_english: string;
    };
    ayah: {
      number: number;
      text_arabic: string;
    };
    confidence: number;
    alternatives?: Array<{...}>;
  };
  processing_time_ms: number;
}
```

### Expected Outcome
- User can record and get results
- Correct Ayah displayed for test recitations
- Smooth navigation to result screen

---

## Session 6: Quran Reader UI Implementation

### Goals
- Build complete Quran reading interface
- Implement proper Arabic text rendering
- Create verse highlighting system

### Tasks
1. Install and configure HeroUI
2. Create Surah list screen
3. Build Ayah display component
4. Implement Arabic typography settings
5. Create verse highlighting mechanism
6. Add smooth scroll to detected verse
7. Implement accessibility features

### Files/Components to Create
```
/mobile/src
  /presentation/screens
    QuranListScreen.tsx
    SurahScreen.tsx
  /presentation/components
    SurahCard.tsx
    AyahText.tsx
    VerseHighlight.tsx
    ArabicText.tsx
  /presentation/navigation
    QuranNavigator.tsx
  /constants
    typography.ts
    colors.ts
```

### Typography Configuration
```typescript
const ARABIC_TYPOGRAPHY = {
  fontFamily: 'Amiri', // or 'Scheherazade New'
  fontSize: {
    small: 20,
    medium: 24,
    large: 28,
    xlarge: 32,
  },
  lineHeight: 2.0,
  textAlign: 'right',
};
```

### Expected Outcome
- Beautiful Quran reading interface
- Proper Arabic text rendering
- Highlighted verse after detection
- Smooth scrolling experience

---

## Session 7: Repeated Ayah Handling

### Goals
- Implement sequence-based matching
- Handle ambiguous results
- Add confidence scoring UI

### Tasks
1. Identify all repeated/similar Ayahs in Quran
2. Implement sequence fingerprinting
3. Create adaptive listening logic
4. Build disambiguation UI
5. Implement confidence thresholds
6. Add user feedback mechanism
7. Write comprehensive tests

### Files/Components to Create
```
/backend/ml-service
  /src
    /fingerprint
      sequence_matcher.py
      similarity_scorer.py
    /data
      repeated_ayahs.json

/mobile/src
  /presentation/components
    AmbiguousResultDialog.tsx
    ConfidenceIndicator.tsx
    ContinueListeningPrompt.tsx
  /domain/usecases
    ResolveAmbiguousMatchUseCase.ts
```

### Repeated Ayah Strategy
```
1. Initial match returns candidates with scores
2. If top candidate confidence > 0.9: return immediately
3. If multiple candidates with similar scores:
   a. Check sequence context (previous/next ayah patterns)
   b. If still ambiguous: prompt user to continue listening
   c. After extended listening: re-match with sequence
4. If confidence < 0.7: show "uncertain" indicator
```

### Expected Outcome
- 95%+ accuracy including repeated Ayahs
- Clear user feedback on confidence
- Graceful handling of ambiguous cases

---

## Session 8: Performance Optimization

### Goals
- Reduce recognition latency
- Optimize app performance
- Implement caching

### Tasks
1. Profile audio upload time
2. Implement audio streaming (if beneficial)
3. Add response caching
4. Optimize fingerprint matching
5. Implement background processing
6. Add performance monitoring
7. Load testing

### Files/Components to Create
```
/mobile/src
  /services
    CacheService.ts
    PerformanceMonitor.ts
  /utils
    audioCompression.ts

/backend
  /api-gateway/src
    /middleware
      cache.middleware.ts
    /services
      cache.service.ts
```

### Performance Targets
| Metric | Current | Target |
|--------|---------|--------|
| Audio upload | ~2s | <1s |
| Fingerprint generation | ~1s | <0.5s |
| Matching | ~1s | <0.3s |
| **Total latency** | ~5s | <3s |

### Expected Outcome
- Recognition in < 3 seconds
- Smooth UI with no jank
- App handles poor network gracefully

---

## Session 9: Error Handling & Edge Cases

### Goals
- Implement comprehensive error handling
- Handle offline scenarios
- Add retry logic

### Tasks
1. Define error types and codes
2. Implement error boundaries in UI
3. Add network retry with exponential backoff
4. Handle microphone permission denial
5. Implement offline detection
6. Add error analytics
7. User-friendly error messages

### Files/Components to Create
```
/mobile/src
  /utils
    errorHandler.ts
  /presentation/components
    ErrorBoundary.tsx
    OfflineNotice.tsx
    RetryButton.tsx
  /constants
    errorMessages.ts
  /services
    NetworkMonitor.ts
```

### Error Handling Matrix
| Error Type | User Message | Action |
|------------|--------------|--------|
| No network | "No internet connection" | Show offline mode |
| Mic denied | "Microphone access needed" | Open settings |
| No match | "Couldn't identify the recitation" | Suggest retry |
| Server error | "Something went wrong" | Auto-retry |
| Timeout | "Taking too long" | Retry with feedback |

### Expected Outcome
- No unhandled crashes
- Clear user feedback for all errors
- Graceful degradation

---

## Session 10: Testing & Quality Assurance

### Goals
- Achieve 80% test coverage
- Integration testing
- User acceptance testing

### Tasks
1. Write unit tests for domain layer
2. Write integration tests for API
3. Create E2E tests with Detox
4. Set up test data fixtures
5. Performance regression tests
6. Accessibility testing
7. Beta testing with real users

### Files/Components to Create
```
/mobile
  /__tests__
    /unit
      AudioRecorder.test.ts
      QuranRepository.test.ts
    /integration
      RecognitionFlow.test.ts
    /e2e
      recognition.e2e.ts
      quranReader.e2e.ts

/backend
  /tests
    /unit
    /integration
    /fixtures
```

### Test Coverage Targets
| Layer | Target |
|-------|--------|
| Domain (use cases) | 90% |
| Data (repositories) | 80% |
| Services | 85% |
| UI Components | 70% |

### Expected Outcome
- Confident in code quality
- Automated regression testing
- Known issues documented

---

## Session 11: Production Preparation

### Goals
- Prepare for app store submission
- Set up production infrastructure
- Create deployment pipeline

### Tasks
1. Configure production environment variables
2. Set up production database
3. Configure CDN for static assets
4. Set up monitoring (Sentry, analytics)
5. Create app store assets (icons, screenshots)
6. Write app store descriptions
7. Security audit

### Deliverables
- [ ] Production backend deployed
- [ ] App signed and built for stores
- [ ] Monitoring dashboards set up
- [ ] App store listing prepared
- [ ] Privacy policy and terms of service

### Expected Outcome
- Ready for app store submission
- Production environment running
- Monitoring in place

---

## Session 12: Launch & Iteration

### Goals
- Submit to app stores
- Monitor launch metrics
- Plan first iteration

### Tasks
1. Submit to Apple App Store
2. Submit to Google Play Store
3. Monitor crash reports
4. Track usage analytics
5. Collect user feedback
6. Prioritize first update
7. Document lessons learned

### Post-Launch Monitoring
```
Daily checks:
- Crash-free rate
- Recognition success rate
- Average latency
- User reviews

Weekly:
- DAU/MAU trends
- Feature usage
- Error patterns
```

### Expected Outcome
- App live in stores
- Baseline metrics established
- Roadmap for v1.1

---

## Quick Reference: Session Dependencies

```
Session 1 (Setup)
    ↓
Session 2 (Data) ←──────────────────┐
    ↓                               │
Session 3 (Audio Capture)           │
    ↓                               │
Session 4 (Fingerprinting)          │
    ↓                               │
Session 5 (Integration) ────────────┤
    ↓                               │
Session 6 (UI) ←────────────────────┘
    ↓
Session 7 (Repeated Ayahs)
    ↓
Session 8 (Performance) ──┐
    ↓                     │
Session 9 (Errors) ───────┤
    ↓                     │
Session 10 (Testing) ←────┘
    ↓
Session 11 (Production)
    ↓
Session 12 (Launch)
```
