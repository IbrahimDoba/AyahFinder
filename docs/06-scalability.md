# Ayahfinder - Scalability & Future-Proofing

## Overview

This document outlines how the Ayahfinder architecture supports growth from MVP to millions of users, while remaining flexible for future enhancements.

---

## Scaling Strategy by User Count

### Phase 1: MVP (0 - 10K Users)

```
┌─────────────────────────────────────────────────────────┐
│                    SIMPLE ARCHITECTURE                   │
│                                                          │
│  Mobile App ───► Single API Server ───► PostgreSQL       │
│                        │                                 │
│                        └──► Pinecone (Managed)           │
│                        └──► S3 (Audio Storage)           │
└─────────────────────────────────────────────────────────┘
```

**Infrastructure:**
- Single API server (2 vCPU, 4GB RAM)
- Single PostgreSQL instance (db.t3.medium)
- Pinecone starter tier
- S3 for temporary audio storage

**Monthly Cost:** ~$200-400

### Phase 2: Growth (10K - 100K Users)

```
┌──────────────────────────────────────────────────────────┐
│                   HORIZONTALLY SCALED                     │
│                                                           │
│  Mobile App ───► Load Balancer ───► API Servers (3x)     │
│                        │                                  │
│                        ├──► PostgreSQL (Primary + Read)   │
│                        ├──► Redis (Cache/Sessions)        │
│                        ├──► ML Service (2x)               │
│                        └──► Pinecone (Standard)           │
└──────────────────────────────────────────────────────────┘
```

**Infrastructure:**
- 3 API servers behind load balancer
- PostgreSQL with read replica
- Redis cluster for caching
- 2 ML service instances
- CDN for static assets

**Monthly Cost:** ~$800-1,500

### Phase 3: Scale (100K - 1M Users)

```
┌──────────────────────────────────────────────────────────┐
│                    FULL KUBERNETES                        │
│                                                           │
│  Mobile App ───► CloudFront ───► ALB ───► K8s Cluster    │
│                                     │                     │
│                    ┌────────────────┼────────────────┐    │
│                    │                │                │    │
│              API Pods (HPA)   ML Pods (HPA)    Workers   │
│                    │                │                │    │
│                    └───────────┬────┴────────────────┘    │
│                                │                          │
│            ┌───────────────────┼───────────────────┐      │
│            │                   │                   │      │
│      Aurora (Multi-AZ)    ElastiCache        Pinecone     │
│                               (Redis)        (Enterprise) │
└──────────────────────────────────────────────────────────┘
```

**Infrastructure:**
- Kubernetes (EKS) with auto-scaling
- Aurora PostgreSQL (Multi-AZ)
- ElastiCache Redis cluster
- Multiple ML service pods with GPU
- Pinecone enterprise tier
- Global CDN

**Monthly Cost:** ~$5,000-15,000

---

## Horizontal Scaling Components

### API Gateway Scaling

```yaml
# kubernetes/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    spec:
      containers:
      - name: api
        image: ayahfinder/api-gateway:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        ports:
        - containerPort: 3000

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### ML Service Scaling

```yaml
# kubernetes/ml-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-service
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: ml
        image: ayahfinder/ml-service:latest
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        env:
        - name: WORKERS
          value: "4"

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ml-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ml-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

---

## Database Scaling

### PostgreSQL Strategy

| Scale | Strategy | Configuration |
|-------|----------|---------------|
| MVP | Single instance | db.t3.medium |
| 10K-50K | Primary + Read replica | db.r5.large |
| 50K-200K | Aurora Cluster | 2 readers |
| 200K+ | Aurora Global | Multi-region |

### Read/Write Splitting

```typescript
// src/config/database.ts
import { Pool } from 'pg';

const writePool = new Pool({
  host: process.env.DB_PRIMARY_HOST,
  database: 'ayahfinder',
  max: 20,
});

const readPool = new Pool({
  host: process.env.DB_REPLICA_HOST,
  database: 'ayahfinder',
  max: 50,  // More connections for reads
});

export const db = {
  write: writePool,
  read: readPool,

  async query(sql: string, params?: any[], isWrite = false) {
    const pool = isWrite ? writePool : readPool;
    return pool.query(sql, params);
  }
};
```

### Query Optimization

```sql
-- Indexes for common queries
CREATE INDEX CONCURRENTLY idx_ayahs_surah_number
ON ayahs(surah_id, ayah_number);

CREATE INDEX CONCURRENTLY idx_fingerprints_lookup
ON fingerprints(ayah_id, reciter_id);

-- Partial index for active reciters
CREATE INDEX CONCURRENTLY idx_active_reciters
ON reciters(id) WHERE is_active = true;

-- Materialized view for Surah statistics
CREATE MATERIALIZED VIEW surah_stats AS
SELECT
  s.id,
  s.number,
  s.name_arabic,
  COUNT(f.id) as fingerprint_count,
  COUNT(DISTINCT f.reciter_id) as reciter_count
FROM surahs s
LEFT JOIN ayahs a ON a.surah_id = s.id
LEFT JOIN fingerprints f ON f.ayah_id = a.id
GROUP BY s.id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY surah_stats;
```

---

## Caching Strategy

### Multi-Layer Cache

```
┌─────────────────────────────────────────────────────────┐
│                    CACHE LAYERS                          │
│                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │   L1: App   │   │  L2: Redis  │   │ L3: CDN     │    │
│  │   Memory    │ → │   Cluster   │ → │ (Static)    │    │
│  │   (LRU)     │   │   (Shared)  │   │             │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
│                                                          │
│  TTL: 5 min       TTL: 1 hour       TTL: 24 hours       │
└─────────────────────────────────────────────────────────┘
```

### Redis Cache Implementation

```typescript
// src/services/cache.service.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: 3,
});

export class CacheService {
  // Cache keys
  private static KEYS = {
    surah: (id: number) => `surah:${id}`,
    surahAyahs: (id: number) => `surah:${id}:ayahs`,
    allSurahs: 'surahs:all',
    recognition: (hash: string) => `recognition:${hash}`,
  };

  // TTLs in seconds
  private static TTL = {
    surah: 3600,        // 1 hour
    recognition: 300,   // 5 minutes
    static: 86400,      // 24 hours
  };

  async getSurah(id: number): Promise<Surah | null> {
    const cached = await redis.get(CacheService.KEYS.surah(id));
    if (cached) return JSON.parse(cached);
    return null;
  }

  async setSurah(surah: Surah): Promise<void> {
    await redis.setex(
      CacheService.KEYS.surah(surah.id),
      CacheService.TTL.surah,
      JSON.stringify(surah)
    );
  }

  async invalidateSurah(id: number): Promise<void> {
    await redis.del(CacheService.KEYS.surah(id));
    await redis.del(CacheService.KEYS.surahAyahs(id));
  }

  // Audio fingerprint cache (for repeated queries)
  async getRecognitionResult(audioHash: string): Promise<any | null> {
    const cached = await redis.get(CacheService.KEYS.recognition(audioHash));
    if (cached) return JSON.parse(cached);
    return null;
  }

  async setRecognitionResult(audioHash: string, result: any): Promise<void> {
    await redis.setex(
      CacheService.KEYS.recognition(audioHash),
      CacheService.TTL.recognition,
      JSON.stringify(result)
    );
  }
}
```

---

## Supporting Multiple Reciters

### Data Model Extension

```sql
-- Extended schema for multiple reciters
CREATE TABLE reciters (
    id SERIAL PRIMARY KEY,
    name_arabic VARCHAR(200) NOT NULL,
    name_english VARCHAR(200) NOT NULL,
    qiraat VARCHAR(50) DEFAULT 'hafs',
    riwayah VARCHAR(50) DEFAULT 'hafs_an_asim',
    style VARCHAR(50),  -- murattal, mujawwad
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,  -- For ranking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fingerprints are per-reciter
CREATE TABLE fingerprints (
    id SERIAL PRIMARY KEY,
    ayah_id INTEGER REFERENCES ayahs(id),
    reciter_id INTEGER REFERENCES reciters(id),
    vector_id VARCHAR(100) NOT NULL,
    duration_ms INTEGER,
    quality_score FLOAT,
    UNIQUE(ayah_id, reciter_id)
);
```

### Multi-Reciter Matching

```python
class MultiReciterMatcher:
    def __init__(self, pinecone_client, reciters: List[Reciter]):
        self.pinecone = pinecone_client
        self.reciters = {r.id: r for r in reciters}

    def match(
        self,
        audio_embedding: np.ndarray,
        preferred_reciter: Optional[int] = None
    ) -> MatchResult:
        # Query across all reciters
        results = self.pinecone.query(
            vector=audio_embedding,
            top_k=20,
            include_metadata=True,
            filter={
                "reciter_id": {"$in": list(self.reciters.keys())}
            }
        )

        # Group by ayah
        ayah_matches = self._group_by_ayah(results.matches)

        # Score each ayah (aggregate across reciters)
        scored_ayahs = []
        for ayah_key, matches in ayah_matches.items():
            best_match = max(matches, key=lambda m: m.score)
            reciter_count = len(matches)

            # Boost score if matched by multiple reciters
            multi_reciter_bonus = min(reciter_count * 0.02, 0.1)

            scored_ayahs.append({
                'ayah': ayah_key,
                'score': best_match.score + multi_reciter_bonus,
                'reciter': best_match.metadata['reciter_id'],
                'reciters_matched': reciter_count
            })

        # Apply preferred reciter boost
        if preferred_reciter:
            for ayah in scored_ayahs:
                if ayah['reciter'] == preferred_reciter:
                    ayah['score'] += 0.05

        scored_ayahs.sort(key=lambda x: -x['score'])
        return self._create_result(scored_ayahs)
```

### Adding New Reciters (Future Workflow)

```python
# scripts/add_reciter.py
def add_reciter(
    name: str,
    audio_directory: str,
    qiraat: str = 'hafs'
) -> int:
    """
    Workflow to add a new reciter:
    1. Validate audio files
    2. Add reciter to database
    3. Generate fingerprints
    4. Upload to vector database
    5. Activate for matching
    """

    # 1. Validate audio files
    validator = AudioValidator()
    if not validator.validate_directory(audio_directory):
        raise ValueError("Invalid audio files")

    # 2. Add reciter to database
    reciter_id = db.insert_reciter(name, qiraat, is_active=False)

    # 3. Generate fingerprints (async job)
    job = FingerprintGenerationJob(
        reciter_id=reciter_id,
        audio_dir=audio_directory
    )
    job_id = queue.enqueue(job)

    # 4. Monitor job completion
    # 5. Activate reciter when complete

    return reciter_id
```

---

## Supporting Different Qira'at

### Qira'at Data Model

```sql
-- Qira'at and Riwayat support
CREATE TABLE qiraat (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_arabic VARCHAR(100),
    description TEXT
);

CREATE TABLE riwayat (
    id SERIAL PRIMARY KEY,
    qiraat_id INTEGER REFERENCES qiraat(id),
    name VARCHAR(100) NOT NULL,
    name_arabic VARCHAR(100),
    reader_name VARCHAR(100),  -- e.g., Hafs, Warsh
    transmitter_name VARCHAR(100)  -- e.g., Asim, Nafi
);

-- Ayah text variants per Qira'at
CREATE TABLE ayah_variants (
    id SERIAL PRIMARY KEY,
    ayah_id INTEGER REFERENCES ayahs(id),
    riwayah_id INTEGER REFERENCES riwayat(id),
    text_arabic TEXT NOT NULL,
    text_uthmani TEXT,
    pronunciation_notes TEXT,
    UNIQUE(ayah_id, riwayah_id)
);

-- Pre-populated Qira'at
INSERT INTO qiraat (name, name_arabic) VALUES
('Hafs', 'حفص'),
('Warsh', 'ورش'),
('Qalun', 'قالون'),
('Al-Duri', 'الدوري'),
('Shu''bah', 'شعبة'),
('Ibn Kathir', 'ابن كثير'),
('Abu Amr', 'أبو عمرو');
```

### Qira'at-Aware Matching

```python
class QiraatMatcher:
    def match(
        self,
        audio_embedding: np.ndarray,
        qiraat_filter: Optional[str] = None
    ) -> MatchResult:
        # Apply Qira'at filter to Pinecone query
        filter_condition = {}
        if qiraat_filter:
            filter_condition['qiraat'] = qiraat_filter

        results = self.pinecone.query(
            vector=audio_embedding,
            top_k=10,
            filter=filter_condition if filter_condition else None
        )

        return self._process_results(results)
```

---

## Offline Mode (Future)

### Architecture for Offline

```
┌─────────────────────────────────────────────────────────┐
│                    OFFLINE ARCHITECTURE                  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │                 MOBILE DEVICE                    │    │
│  │                                                  │    │
│  │  ┌─────────────┐    ┌─────────────┐             │    │
│  │  │  Audio      │───►│  On-Device  │             │    │
│  │  │  Capture    │    │  ML Model   │             │    │
│  │  └─────────────┘    └──────┬──────┘             │    │
│  │                            │                     │    │
│  │                     ┌──────▼──────┐             │    │
│  │                     │  Local      │             │    │
│  │                     │  Vector DB  │             │    │
│  │                     │  (SQLite +  │             │    │
│  │                     │  FAISS)     │             │    │
│  │                     └──────┬──────┘             │    │
│  │                            │                     │    │
│  │                     ┌──────▼──────┐             │    │
│  │                     │  Quran      │             │    │
│  │                     │  Text DB    │             │    │
│  │                     │  (SQLite)   │             │    │
│  │                     └─────────────┘             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  Sync Strategy: Download fingerprints on first launch    │
│  Update: Delta sync when connected                       │
│  Size: ~50-100MB for one reciter                        │
└─────────────────────────────────────────────────────────┘
```

### On-Device ML Model

```typescript
// Future: On-device model with TensorFlow Lite
interface OfflineRecognitionService {
  // Download model and fingerprints
  downloadOfflineData(reciterId: number): Promise<void>;

  // Check if offline data is available
  isOfflineReady(): Promise<boolean>;

  // Run recognition locally
  recognizeOffline(audio: AudioBuffer): Promise<RecognitionResult>;

  // Sync updates when online
  syncUpdates(): Promise<void>;
}
```

---

## Web Version (Future)

### Shared Core Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 SHARED ARCHITECTURE                      │
│                                                          │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │   Mobile App    │    │    Web App      │             │
│  │  (React Native) │    │   (Next.js)     │             │
│  └────────┬────────┘    └────────┬────────┘             │
│           │                      │                       │
│           └──────────┬───────────┘                       │
│                      │                                   │
│           ┌──────────▼──────────┐                       │
│           │   Shared Domain     │                       │
│           │   (TypeScript)      │                       │
│           │   - Entities        │                       │
│           │   - Use Cases       │                       │
│           │   - Interfaces      │                       │
│           └──────────┬──────────┘                       │
│                      │                                   │
│           ┌──────────▼──────────┐                       │
│           │   Same Backend API  │                       │
│           └─────────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
ayahfinder/
├── packages/
│   ├── core/              # Shared domain logic
│   │   ├── entities/
│   │   ├── usecases/
│   │   └── repositories/
│   ├── mobile/            # React Native app
│   │   ├── src/
│   │   └── package.json
│   ├── web/               # Next.js app
│   │   ├── src/
│   │   └── package.json
│   └── api-client/        # Shared API client
│       └── src/
├── backend/
│   ├── api-gateway/
│   └── ml-service/
├── package.json
└── turbo.json             # Turborepo config
```

---

## AI Improvements Without Refactoring

### Plugin Architecture for ML Models

```python
# src/ml/base.py
from abc import ABC, abstractmethod

class BaseRecognizer(ABC):
    @abstractmethod
    def generate_fingerprint(self, audio: np.ndarray) -> np.ndarray:
        pass

    @abstractmethod
    def match(self, fingerprint: np.ndarray) -> List[Candidate]:
        pass


# src/ml/chromaprint_recognizer.py
class ChromaprintRecognizer(BaseRecognizer):
    """Current implementation using Chromaprint"""
    pass


# src/ml/transformer_recognizer.py (Future)
class TransformerRecognizer(BaseRecognizer):
    """Future: Transformer-based audio recognition"""
    pass


# src/ml/factory.py
class RecognizerFactory:
    _recognizers = {
        'chromaprint': ChromaprintRecognizer,
        'transformer': TransformerRecognizer,
    }

    @classmethod
    def create(cls, name: str) -> BaseRecognizer:
        recognizer_class = cls._recognizers.get(name)
        if not recognizer_class:
            raise ValueError(f"Unknown recognizer: {name}")
        return recognizer_class()
```

### Feature Flags for ML Experiments

```python
# src/config/feature_flags.py
FEATURE_FLAGS = {
    'use_transformer_model': {
        'enabled': False,
        'rollout_percentage': 0,
    },
    'extended_sequence_matching': {
        'enabled': True,
        'rollout_percentage': 100,
    },
    'multi_reciter_boost': {
        'enabled': True,
        'rollout_percentage': 50,
    },
}

def is_feature_enabled(feature: str, user_id: Optional[str] = None) -> bool:
    flag = FEATURE_FLAGS.get(feature)
    if not flag or not flag['enabled']:
        return False

    if flag['rollout_percentage'] == 100:
        return True

    if user_id:
        # Consistent rollout based on user ID
        hash_value = hash(f"{feature}:{user_id}") % 100
        return hash_value < flag['rollout_percentage']

    return random.randint(0, 99) < flag['rollout_percentage']
```

---

## Cost Optimization at Scale

| Strategy | Savings | Implementation |
|----------|---------|----------------|
| Audio compression | 60% bandwidth | Client-side FLAC encoding |
| Response caching | 40% API calls | Redis cache for repeated queries |
| CDN for static | 70% origin load | CloudFront for Quran text |
| Spot instances | 50% compute | ML workers on spot |
| Reserved instances | 30% baseline | API servers on reserved |
| Tiered Pinecone | Variable | Use starter tier initially |

### Cost per 1000 Recognitions

| Scale | Cost | Breakdown |
|-------|------|-----------|
| MVP | $0.50 | Compute + Pinecone |
| 100K users | $0.15 | Optimized + caching |
| 1M users | $0.05 | Full optimization |
