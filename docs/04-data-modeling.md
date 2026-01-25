# Ayahfinder - Data Modeling

## Overview

This document describes how Quran data, audio fingerprints, and recognition results are structured and stored.

---

## Quran Text Database (PostgreSQL)

### Entity Relationship Diagram
```
┌─────────────────┐       ┌─────────────────┐
│     surahs      │       │     ayahs       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ id (PK)         │
│ number          │       │ surah_id (FK)   │
│ name_arabic     │       │ ayah_number     │
│ name_english    │       │ text_arabic     │
│ name_translit   │       │ text_uthmani    │
│ revelation_type │       │ juz_number      │
│ ayah_count      │       │ page_number     │
│ created_at      │       │ hizb_number     │
│ updated_at      │       │ created_at      │
└─────────────────┘       └─────────────────┘
                                  │
                                  │
                          ┌───────▼───────────┐
                          │   fingerprints    │
                          ├───────────────────┤
                          │ id (PK)           │
                          │ ayah_id (FK)      │
                          │ reciter_id (FK)   │
                          │ fingerprint_hash  │
                          │ vector_id         │
                          │ duration_ms       │
                          │ created_at        │
                          └───────────────────┘
                                  │
                          ┌───────▼───────────┐
                          │     reciters      │
                          ├───────────────────┤
                          │ id (PK)           │
                          │ name_arabic       │
                          │ name_english      │
                          │ qiraat            │
                          │ style             │
                          │ is_active         │
                          └───────────────────┘
```

### Schema Definitions

```sql
-- Surahs table
CREATE TABLE surahs (
    id SERIAL PRIMARY KEY,
    number INTEGER UNIQUE NOT NULL CHECK (number >= 1 AND number <= 114),
    name_arabic VARCHAR(100) NOT NULL,
    name_english VARCHAR(100) NOT NULL,
    name_transliteration VARCHAR(100),
    revelation_type VARCHAR(20) CHECK (revelation_type IN ('meccan', 'medinan')),
    ayah_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ayahs table
CREATE TABLE ayahs (
    id SERIAL PRIMARY KEY,
    surah_id INTEGER NOT NULL REFERENCES surahs(id) ON DELETE CASCADE,
    ayah_number INTEGER NOT NULL,
    text_arabic TEXT NOT NULL,
    text_uthmani TEXT,  -- Uthmani script version
    juz_number INTEGER CHECK (juz_number >= 1 AND juz_number <= 30),
    page_number INTEGER,
    hizb_number INTEGER,
    sajda_type VARCHAR(20),  -- 'obligatory', 'recommended', or NULL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(surah_id, ayah_number)
);

-- Reciters table
CREATE TABLE reciters (
    id SERIAL PRIMARY KEY,
    name_arabic VARCHAR(200) NOT NULL,
    name_english VARCHAR(200) NOT NULL,
    qiraat VARCHAR(50) DEFAULT 'hafs',  -- hafs, warsh, etc.
    style VARCHAR(50),  -- murattal, mujawwad, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fingerprints metadata table
CREATE TABLE fingerprints (
    id SERIAL PRIMARY KEY,
    ayah_id INTEGER NOT NULL REFERENCES ayahs(id) ON DELETE CASCADE,
    reciter_id INTEGER NOT NULL REFERENCES reciters(id) ON DELETE CASCADE,
    fingerprint_hash VARCHAR(64) NOT NULL,  -- SHA-256 of fingerprint
    vector_id VARCHAR(100) NOT NULL,  -- Pinecone vector ID
    duration_ms INTEGER NOT NULL,
    audio_quality VARCHAR(20),  -- 'high', 'medium', 'low'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ayah_id, reciter_id)
);

-- Indexes for performance
CREATE INDEX idx_ayahs_surah ON ayahs(surah_id);
CREATE INDEX idx_ayahs_juz ON ayahs(juz_number);
CREATE INDEX idx_fingerprints_ayah ON fingerprints(ayah_id);
CREATE INDEX idx_fingerprints_reciter ON fingerprints(reciter_id);
CREATE INDEX idx_fingerprints_vector ON fingerprints(vector_id);
```

---

## Audio Fingerprint Storage (Pinecone)

### Vector Database Design

Pinecone stores audio fingerprints as high-dimensional vectors for similarity search.

#### Vector Structure
```python
{
    "id": "fp_001_001_01",  # fingerprint_surah_ayah_reciter
    "values": [0.123, -0.456, ...],  # 128-dimensional embedding
    "metadata": {
        "surah_number": 1,
        "ayah_number": 1,
        "reciter_id": 1,
        "duration_ms": 4500,
        "text_preview": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
        "is_repeated": false,
        "similar_ayahs": []
    }
}
```

#### Index Configuration
```python
pinecone.create_index(
    name="ayahfinder-fingerprints",
    dimension=128,
    metric="cosine",
    pods=1,
    replicas=1,
    pod_type="p1.x1"
)
```

### Fingerprint Generation Process

```python
class FingerprintGenerator:
    def __init__(self):
        self.sample_rate = 16000
        self.hop_length = 512
        self.n_mels = 128
        self.n_fft = 2048

    def generate(self, audio_path: str) -> np.ndarray:
        # 1. Load and preprocess audio
        audio, sr = librosa.load(audio_path, sr=self.sample_rate)
        audio = self._preprocess(audio)

        # 2. Generate Chromaprint fingerprint
        chromaprint = self._generate_chromaprint(audio)

        # 3. Generate mel spectrogram features
        mel_features = self._generate_mel_features(audio)

        # 4. Combine into final embedding
        embedding = self._create_embedding(chromaprint, mel_features)

        return embedding  # 128-dimensional vector

    def _preprocess(self, audio: np.ndarray) -> np.ndarray:
        # Normalize audio
        audio = audio / np.max(np.abs(audio))
        # Apply noise reduction
        audio = nr.reduce_noise(y=audio, sr=self.sample_rate)
        return audio

    def _generate_chromaprint(self, audio: np.ndarray) -> np.ndarray:
        # Generate Chromaprint fingerprint
        fp = chromaprint.fingerprint(audio, self.sample_rate)
        return np.array(fp[:64])  # Take first 64 components

    def _generate_mel_features(self, audio: np.ndarray) -> np.ndarray:
        # Generate mel spectrogram
        mel = librosa.feature.melspectrogram(
            y=audio, sr=self.sample_rate,
            n_mels=self.n_mels, n_fft=self.n_fft,
            hop_length=self.hop_length
        )
        # Aggregate over time
        mel_mean = np.mean(mel, axis=1)
        mel_std = np.std(mel, axis=1)
        return np.concatenate([mel_mean[:32], mel_std[:32]])  # 64 features

    def _create_embedding(
        self,
        chromaprint: np.ndarray,
        mel_features: np.ndarray
    ) -> np.ndarray:
        # Combine features
        combined = np.concatenate([chromaprint, mel_features])
        # Normalize to unit length
        return combined / np.linalg.norm(combined)
```

---

## Matching Algorithm

### Similarity Scoring

```python
class MatchingService:
    def __init__(self, pinecone_client, threshold: float = 0.75):
        self.index = pinecone_client
        self.threshold = threshold
        self.top_k = 10

    def match(self, query_embedding: np.ndarray) -> MatchResult:
        # 1. Query Pinecone for similar vectors
        results = self.index.query(
            vector=query_embedding.tolist(),
            top_k=self.top_k,
            include_metadata=True
        )

        # 2. Filter by threshold
        candidates = [
            match for match in results.matches
            if match.score >= self.threshold
        ]

        if not candidates:
            return MatchResult(success=False, reason="no_match")

        # 3. Apply confidence scoring
        scored_candidates = self._score_candidates(candidates)

        # 4. Check for ambiguity
        if self._is_ambiguous(scored_candidates):
            return MatchResult(
                success=True,
                is_ambiguous=True,
                candidates=scored_candidates[:3],
                confidence=scored_candidates[0].confidence
            )

        # 5. Return best match
        best = scored_candidates[0]
        return MatchResult(
            success=True,
            is_ambiguous=False,
            surah_number=best.metadata["surah_number"],
            ayah_number=best.metadata["ayah_number"],
            confidence=best.confidence
        )

    def _score_candidates(self, candidates: List) -> List:
        scored = []
        for c in candidates:
            # Base score from vector similarity
            base_score = c.score

            # Penalty for repeated ayahs
            repeat_penalty = 0.1 if c.metadata.get("is_repeated") else 0

            # Final confidence
            confidence = base_score - repeat_penalty

            scored.append(ScoredCandidate(
                metadata=c.metadata,
                confidence=confidence,
                raw_score=base_score
            ))

        return sorted(scored, key=lambda x: -x.confidence)

    def _is_ambiguous(self, candidates: List) -> bool:
        if len(candidates) < 2:
            return False

        # Ambiguous if top 2 scores are within 5%
        score_diff = candidates[0].confidence - candidates[1].confidence
        return score_diff < 0.05
```

### Confidence Thresholds

| Confidence Level | Range | Action |
|------------------|-------|--------|
| High | >= 0.90 | Return result immediately |
| Medium | 0.75 - 0.89 | Return with indicator |
| Low | 0.60 - 0.74 | Prompt to continue listening |
| No Match | < 0.60 | Return "not found" |

---

## Domain Entities (Mobile App)

### TypeScript Models

```typescript
// src/domain/entities/Surah.ts
export interface Surah {
  id: number;
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration: string;
  revelationType: 'meccan' | 'medinan';
  ayahCount: number;
}

// src/domain/entities/Ayah.ts
export interface Ayah {
  id: number;
  surahId: number;
  surahNumber: number;
  ayahNumber: number;
  textArabic: string;
  textUthmani?: string;
  juzNumber: number;
  pageNumber: number;
  hizbNumber: number;
  sajdaType?: 'obligatory' | 'recommended';
}

// src/domain/entities/RecognitionResult.ts
export interface RecognitionResult {
  success: boolean;
  isAmbiguous: boolean;
  surah: Surah;
  ayah: Ayah;
  confidence: number;
  processingTimeMs: number;
  alternatives?: AlternativeMatch[];
}

export interface AlternativeMatch {
  surah: Surah;
  ayah: Ayah;
  confidence: number;
}

// src/domain/entities/Reciter.ts
export interface Reciter {
  id: number;
  nameArabic: string;
  nameEnglish: string;
  qiraat: 'hafs' | 'warsh' | 'qalun' | string;
  style: 'murattal' | 'mujawwad' | string;
}
```

### Data Transfer Objects

```typescript
// src/data/models/SurahDTO.ts
export interface SurahDTO {
  id: number;
  number: number;
  name_arabic: string;
  name_english: string;
  name_transliteration: string;
  revelation_type: string;
  ayah_count: number;
}

export function mapSurahDTOToEntity(dto: SurahDTO): Surah {
  return {
    id: dto.id,
    number: dto.number,
    nameArabic: dto.name_arabic,
    nameEnglish: dto.name_english,
    nameTransliteration: dto.name_transliteration,
    revelationType: dto.revelation_type as 'meccan' | 'medinan',
    ayahCount: dto.ayah_count,
  };
}

// src/data/models/RecognitionResponseDTO.ts
export interface RecognitionResponseDTO {
  success: boolean;
  result: {
    surah: SurahDTO;
    ayah: AyahDTO;
    confidence: number;
    is_ambiguous: boolean;
    alternatives?: Array<{
      surah: SurahDTO;
      ayah: AyahDTO;
      confidence: number;
    }>;
  };
  processing_time_ms: number;
}
```

---

## Data Population

### Initial Data Sources

| Data Type | Source | Format |
|-----------|--------|--------|
| Quran Text | tanzil.net | XML/JSON |
| Audio Files | everyayah.com | MP3 |
| Metadata | quran.com API | JSON |

### Import Script

```python
# scripts/import_quran_data.py
import json
import psycopg2

def import_quran():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    # Load Quran data
    with open('data/quran.json', 'r', encoding='utf-8') as f:
        quran_data = json.load(f)

    # Import Surahs
    for surah in quran_data['surahs']:
        cursor.execute("""
            INSERT INTO surahs (
                number, name_arabic, name_english,
                name_transliteration, revelation_type, ayah_count
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            surah['number'],
            surah['name_arabic'],
            surah['name_english'],
            surah['name_transliteration'],
            surah['revelation_type'],
            len(surah['ayahs'])
        ))
        surah_id = cursor.fetchone()[0]

        # Import Ayahs
        for ayah in surah['ayahs']:
            cursor.execute("""
                INSERT INTO ayahs (
                    surah_id, ayah_number, text_arabic,
                    text_uthmani, juz_number, page_number
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                surah_id,
                ayah['number'],
                ayah['text'],
                ayah.get('text_uthmani'),
                ayah.get('juz'),
                ayah.get('page')
            ))

    conn.commit()
    cursor.close()
    conn.close()

if __name__ == '__main__':
    import_quran()
```

### Fingerprint Generation Script

```python
# scripts/generate_fingerprints.py
import os
from services.fingerprint import FingerprintGenerator
from services.pinecone import PineconeService

def generate_fingerprints(audio_dir: str, reciter_id: int):
    generator = FingerprintGenerator()
    pinecone = PineconeService()

    for surah_num in range(1, 115):
        surah_dir = os.path.join(audio_dir, f"{surah_num:03d}")

        for ayah_file in os.listdir(surah_dir):
            ayah_num = int(ayah_file.split('.')[0])
            audio_path = os.path.join(surah_dir, ayah_file)

            # Generate fingerprint
            embedding = generator.generate(audio_path)

            # Create vector ID
            vector_id = f"fp_{surah_num:03d}_{ayah_num:03d}_{reciter_id:02d}"

            # Store in Pinecone
            pinecone.upsert(
                id=vector_id,
                values=embedding.tolist(),
                metadata={
                    "surah_number": surah_num,
                    "ayah_number": ayah_num,
                    "reciter_id": reciter_id,
                    "duration_ms": get_duration(audio_path)
                }
            )

            print(f"Processed: Surah {surah_num}, Ayah {ayah_num}")

if __name__ == '__main__':
    generate_fingerprints(
        audio_dir='/data/audio/mishary',
        reciter_id=1
    )
```

---

## Quran Statistics

| Metric | Value |
|--------|-------|
| Total Surahs | 114 |
| Total Ayahs | 6,236 |
| Total Words | ~77,449 |
| Longest Surah | Al-Baqarah (286 ayahs) |
| Shortest Surah | Al-Kawthar (3 ayahs) |
| Repeated/Similar Ayahs | ~500 (pairs/groups) |
