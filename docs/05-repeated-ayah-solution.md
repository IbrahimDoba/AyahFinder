# Ayahfinder - Repeated Ayah Problem & Solution

## The Problem

The Quran contains many ayahs (verses) that are identical or nearly identical across different Surahs. This creates a significant challenge for audio recognition because the same recited audio could match multiple locations in the Quran.

### Examples of Repeated Ayahs

| Ayah Text | Occurrences |
|-----------|-------------|
| بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ (Bismillah) | 114 times (start of each Surah except At-Tawbah) |
| فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ | 31 times in Surah Ar-Rahman (55) |
| وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ | 10 times in Surah Al-Mursalat (77) |
| الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ | Multiple times across Quran |

### Problem Categories

1. **Exact Duplicates**: Identical text appearing in multiple Surahs
2. **Near Duplicates**: Same text with minor variations (different endings)
3. **Recurring Refrains**: Repeated phrases within the same Surah
4. **Common Phrases**: Short phrases appearing frequently

---

## Solution Strategy: Multi-Layer Disambiguation

Our solution uses a multi-layer approach combining several techniques:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECOGNITION REQUEST                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│             LAYER 1: Initial Fingerprint Match                  │
│                                                                 │
│  - Compare audio against fingerprint database                   │
│  - Return top N candidates with confidence scores               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
    ┌──────────▼──────────┐   ┌──────────▼──────────┐
    │   HIGH CONFIDENCE   │   │   MULTIPLE MATCHES   │
    │      (>= 0.90)      │   │    (ambiguous)       │
    │                     │   │                      │
    │   Return result     │   │   Continue to        │
    │   immediately       │   │   Layer 2            │
    └─────────────────────┘   └──────────┬───────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│             LAYER 2: Sequence Context Analysis                  │
│                                                                 │
│  - Analyze audio for adjacent ayah patterns                     │
│  - Use known sequence fingerprints for disambiguation           │
│  - Check for Surah-specific prosody markers                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
    ┌──────────▼──────────┐   ┌──────────▼──────────┐
    │   RESOLVED          │   │   STILL AMBIGUOUS    │
    │                     │   │                      │
    │   Return result     │   │   Continue to        │
    │   with context      │   │   Layer 3            │
    └─────────────────────┘   └──────────┬───────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│             LAYER 3: Adaptive Listening                         │
│                                                                 │
│  - Request user to continue listening                           │
│  - Capture more audio (extended duration)                       │
│  - Use combined audio for re-matching                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
    ┌──────────▼──────────┐   ┌──────────▼──────────┐
    │   RESOLVED          │   │   STILL AMBIGUOUS    │
    │                     │   │                      │
    │   Return result     │   │   Present options    │
    │                     │   │   to user            │
    └─────────────────────┘   └─────────────────────┘
```

---

## Layer 1: Initial Fingerprint Matching

### Implementation

```python
class InitialMatcher:
    def __init__(self, pinecone_service, threshold=0.75):
        self.pinecone = pinecone_service
        self.threshold = threshold

    def match(self, audio_embedding: np.ndarray) -> MatchResult:
        # Query for top candidates
        results = self.pinecone.query(
            vector=audio_embedding,
            top_k=10,
            include_metadata=True
        )

        candidates = [
            Candidate(
                surah=r.metadata['surah_number'],
                ayah=r.metadata['ayah_number'],
                score=r.score,
                is_repeated=r.metadata.get('is_repeated', False)
            )
            for r in results.matches
            if r.score >= self.threshold
        ]

        if not candidates:
            return MatchResult(status='NO_MATCH')

        # Check if top candidate is clearly the winner
        if candidates[0].score >= 0.90 and not candidates[0].is_repeated:
            return MatchResult(
                status='CONFIDENT',
                best_match=candidates[0],
                confidence=candidates[0].score
            )

        # Check for ambiguity
        if self._is_ambiguous(candidates):
            return MatchResult(
                status='AMBIGUOUS',
                candidates=candidates[:5],
                confidence=candidates[0].score
            )

        return MatchResult(
            status='CONFIDENT',
            best_match=candidates[0],
            confidence=candidates[0].score
        )

    def _is_ambiguous(self, candidates: List[Candidate]) -> bool:
        if len(candidates) < 2:
            return False

        # Check if multiple candidates have similar scores
        top_score = candidates[0].score
        similar_count = sum(1 for c in candidates if abs(c.score - top_score) < 0.05)

        return similar_count > 1
```

---

## Layer 2: Sequence Context Analysis

### How It Works

Reciters typically recite ayahs in sequence. By analyzing the audio for patterns that indicate the previous or next ayah, we can disambiguate.

### Implementation

```python
class SequenceMatcher:
    def __init__(self, fingerprint_service, sequence_db):
        self.fingerprint = fingerprint_service
        self.sequence_db = sequence_db

    def disambiguate(
        self,
        audio: np.ndarray,
        candidates: List[Candidate]
    ) -> MatchResult:
        # 1. Look for sequence patterns in the audio
        sequence_features = self._extract_sequence_features(audio)

        # 2. For each candidate, check if sequence context matches
        scored_candidates = []
        for candidate in candidates:
            # Get expected sequence context
            expected_context = self.sequence_db.get_context(
                surah=candidate.surah,
                ayah=candidate.ayah
            )

            # Score how well the audio matches this context
            context_score = self._score_context_match(
                sequence_features,
                expected_context
            )

            scored_candidates.append({
                'candidate': candidate,
                'context_score': context_score,
                'combined_score': (candidate.score + context_score) / 2
            })

        # 3. Sort by combined score
        scored_candidates.sort(key=lambda x: -x['combined_score'])

        # 4. Check if disambiguation succeeded
        if self._is_resolved(scored_candidates):
            return MatchResult(
                status='RESOLVED_BY_SEQUENCE',
                best_match=scored_candidates[0]['candidate'],
                confidence=scored_candidates[0]['combined_score']
            )

        return MatchResult(
            status='STILL_AMBIGUOUS',
            candidates=[c['candidate'] for c in scored_candidates[:3]]
        )

    def _extract_sequence_features(self, audio: np.ndarray) -> dict:
        # Look for prosodic breaks (pauses between ayahs)
        # Look for distinctive ending patterns
        # Look for beginning patterns of next ayah

        pauses = self._detect_pauses(audio)
        endings = self._analyze_ending_prosody(audio)

        return {
            'has_pause_after': pauses.get('end', False),
            'has_pause_before': pauses.get('start', False),
            'ending_type': endings.get('type'),
            'continuation_hint': self._detect_continuation(audio)
        }

    def _score_context_match(
        self,
        features: dict,
        expected_context: dict
    ) -> float:
        score = 0.5  # Base score

        # Bonus for matching pause patterns
        if features['has_pause_after'] == expected_context['expects_pause']:
            score += 0.15

        # Bonus for matching continuation patterns
        if features['continuation_hint']:
            next_ayah_pattern = expected_context.get('next_ayah_start')
            if self._matches_pattern(features['continuation_hint'], next_ayah_pattern):
                score += 0.25

        return min(score, 1.0)

    def _is_resolved(self, candidates: List) -> bool:
        if len(candidates) < 2:
            return True

        score_gap = candidates[0]['combined_score'] - candidates[1]['combined_score']
        return score_gap >= 0.10
```

### Sequence Fingerprint Database

```python
# Pre-computed sequence context for repeated ayahs
SEQUENCE_CONTEXT = {
    # Bismillah disambiguation
    (1, 1): {  # Al-Fatiha:1
        'prev_ayah_end': None,
        'next_ayah_start': 'pattern_alhamdulillah',
        'expects_pause': True,
        'surah_prosody': 'fatiha_style'
    },
    (2, 1): {  # Al-Baqarah:1
        'prev_ayah_end': None,
        'next_ayah_start': 'pattern_alif_lam_mim',
        'expects_pause': True,
        'surah_prosody': 'baqarah_opening'
    },
    # ... more patterns

    # Ar-Rahman refrain disambiguation
    (55, 13): {  # First "Fa bi ayyi"
        'prev_ayah_end': 'pattern_ayah_12',
        'next_ayah_start': 'pattern_ayah_14',
        'position_in_surah': 'early'
    },
    (55, 16): {  # Second "Fa bi ayyi"
        'prev_ayah_end': 'pattern_ayah_15',
        'next_ayah_start': 'pattern_ayah_17',
        'position_in_surah': 'early'
    },
    # ... more patterns
}
```

---

## Layer 3: Adaptive Listening

When sequence analysis isn't enough, we ask the user to continue listening.

### Mobile App Implementation

```typescript
// src/presentation/components/ContinueListeningPrompt.tsx
interface ContinueListeningPromptProps {
  candidates: AlternativeMatch[];
  onContinue: () => void;
  onSelectManually: (match: AlternativeMatch) => void;
}

export function ContinueListeningPrompt({
  candidates,
  onContinue,
  onSelectManually
}: ContinueListeningPromptProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Similar verses detected
      </Text>
      <Text style={styles.subtitle}>
        Keep listening for a few more seconds to identify the exact verse
      </Text>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={onContinue}
      >
        <PulseAnimation />
        <Text>Continue Listening</Text>
      </TouchableOpacity>

      <Text style={styles.orText}>Or select manually:</Text>

      {candidates.map((match, index) => (
        <TouchableOpacity
          key={index}
          style={styles.candidateCard}
          onPress={() => onSelectManually(match)}
        >
          <Text style={styles.surahName}>
            {match.surah.nameArabic}
          </Text>
          <Text style={styles.ayahPreview}>
            Ayah {match.ayah.ayahNumber}
          </Text>
          <ConfidenceIndicator value={match.confidence} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

### Backend: Extended Audio Processing

```python
class AdaptiveListeningService:
    def __init__(self, matcher, min_extension=3, max_extension=10):
        self.matcher = matcher
        self.min_extension = min_extension  # seconds
        self.max_extension = max_extension

    def process_extended_audio(
        self,
        original_audio: np.ndarray,
        extended_audio: np.ndarray,
        original_candidates: List[Candidate]
    ) -> MatchResult:
        # Combine audio segments
        combined = np.concatenate([original_audio, extended_audio])

        # Generate new fingerprint for combined audio
        combined_embedding = self.matcher.generate_fingerprint(combined)

        # Create sequence fingerprint (captures transition patterns)
        sequence_embedding = self._generate_sequence_embedding(
            original_audio,
            extended_audio
        )

        # Re-match with enhanced features
        new_results = self.matcher.match_with_sequence(
            audio_embedding=combined_embedding,
            sequence_embedding=sequence_embedding,
            candidate_filter=original_candidates
        )

        if new_results.is_confident:
            return new_results

        # If still ambiguous, return top candidates for user selection
        return MatchResult(
            status='USER_SELECTION_NEEDED',
            candidates=new_results.candidates[:3],
            message='Please select the correct verse from the options'
        )

    def _generate_sequence_embedding(
        self,
        audio1: np.ndarray,
        audio2: np.ndarray
    ) -> np.ndarray:
        # Capture the transition between audio segments
        # This helps identify where we are in the recitation flow

        # Get embeddings for each segment
        emb1 = self.matcher.generate_fingerprint(audio1)
        emb2 = self.matcher.generate_fingerprint(audio2)

        # Capture transition features
        transition = emb2 - emb1  # Change vector

        return np.concatenate([emb1, emb2, transition])
```

---

## Special Handling: Bismillah

The Bismillah appears at the start of 113 Surahs (excluding At-Tawbah). This requires special handling.

### Strategy

1. **Never return Bismillah alone** - If only Bismillah is detected, prompt for more audio
2. **Use next-ayah detection** - Listen for what comes after Bismillah
3. **Reciter patterns** - Different reciters have distinctive Bismillah styles

```python
class BismillahHandler:
    BISMILLAH_SURAHS = list(range(1, 115))  # All except 9
    BISMILLAH_SURAHS.remove(9)  # At-Tawbah has no Bismillah

    def handle(self, match_result: MatchResult, audio: np.ndarray) -> MatchResult:
        if not self._is_bismillah(match_result):
            return match_result

        # Try to detect what comes after Bismillah
        continuation = self._detect_continuation(audio)

        if continuation.is_confident:
            # We know which Surah based on what follows
            return MatchResult(
                status='CONFIDENT',
                surah=continuation.surah,
                ayah=1,  # Bismillah is always first
                confidence=continuation.confidence
            )

        # Request extended listening
        return MatchResult(
            status='NEEDS_EXTENSION',
            message='Continue listening to identify the Surah',
            possible_surahs=self._get_likely_surahs(audio)
        )

    def _is_bismillah(self, result: MatchResult) -> bool:
        # Check if result matches Bismillah pattern
        return (
            result.ayah == 1 and
            result.surah in self.BISMILLAH_SURAHS
        )

    def _detect_continuation(self, audio: np.ndarray) -> Optional[dict]:
        # Look for audio after Bismillah
        # Match against known "second ayah" patterns

        # Each Surah's second ayah has distinctive patterns:
        # Al-Fatiha: الحمد لله رب العالمين
        # Al-Baqarah: الم
        # Al-Imran: الم
        # etc.

        continuation_patterns = self._load_continuation_patterns()
        return self._match_continuation(audio, continuation_patterns)
```

---

## Confidence Scoring System

### Score Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Vector Similarity | 0.40 | Base fingerprint match score |
| Sequence Context | 0.25 | How well adjacent patterns match |
| Duration Match | 0.15 | Audio duration vs expected |
| Reciter Consistency | 0.10 | Match with known reciter patterns |
| Audio Quality | 0.10 | Signal-to-noise ratio |

### Implementation

```python
class ConfidenceScorer:
    def calculate(
        self,
        vector_score: float,
        sequence_score: float,
        duration_match: float,
        reciter_score: float,
        quality_score: float
    ) -> float:
        weights = {
            'vector': 0.40,
            'sequence': 0.25,
            'duration': 0.15,
            'reciter': 0.10,
            'quality': 0.10
        }

        weighted_score = (
            vector_score * weights['vector'] +
            sequence_score * weights['sequence'] +
            duration_match * weights['duration'] +
            reciter_score * weights['reciter'] +
            quality_score * weights['quality']
        )

        return min(max(weighted_score, 0.0), 1.0)
```

---

## Tradeoffs and Why This Works

### Why Multi-Layer Approach?

| Approach | Pros | Cons |
|----------|------|------|
| Single fingerprint | Fast, simple | Cannot handle duplicates |
| Always extended listening | High accuracy | Slow user experience |
| **Multi-layer (our choice)** | Fast for unique ayahs, accurate for duplicates | More complex |

### Why Not Just Use Longer Audio Initially?

- **User Experience**: Users expect quick results (< 3 seconds)
- **Efficiency**: Most ayahs are unique and don't need extended audio
- **Adaptive**: Only extends when necessary

### Why Sequence Analysis?

- **Natural**: Reciters naturally recite in sequence
- **Reliable**: Transition patterns are highly distinctive
- **No Extra User Action**: Uses existing audio

### Why Not Use Full Surah Context?

- **Not Practical**: Users may start from any point
- **Overhead**: Would require loading entire Surah fingerprints
- **Our approach**: Use local context (2-3 ayahs) which is sufficient

---

## Accuracy Targets

| Scenario | Target Accuracy |
|----------|-----------------|
| Unique ayahs | 98% |
| Repeated ayahs (with sequence) | 92% |
| Repeated ayahs (with extension) | 95% |
| Bismillah detection | 90% (with continuation) |
| **Overall** | **95%** |

---

## Fallback: User Selection

When all automated methods fail, we gracefully present options to the user:

```typescript
// Final fallback UI
function AmbiguousResultScreen({ candidates }: Props) {
  return (
    <View>
      <Text style={styles.header}>
        Which verse were you listening to?
      </Text>

      <ScrollView>
        {candidates.map((match) => (
          <VerseOption
            key={`${match.surah.number}-${match.ayah.ayahNumber}`}
            surahName={match.surah.nameArabic}
            ayahNumber={match.ayah.ayahNumber}
            preview={match.ayah.textArabic.slice(0, 50)}
            onSelect={() => confirmSelection(match)}
          />
        ))}
      </ScrollView>

      <Button
        title="Try again with more audio"
        onPress={retryWithExtendedListening}
      />
    </View>
  );
}
```

This ensures users always get a usable result, even in edge cases.
