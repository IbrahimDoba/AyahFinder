export interface QuranMatch {
  surahNumber: number;
  ayahNumber: number;
  text: string; // Arabic Text
  translation: string; // English Translation
  surahName: string; // Surah Name (Transliteration)
  similarity: number;
}

export class QuranMatchingService {
  private static instance: QuranMatchingService;
  private normalizedQuran: {
    surah: number;
    ayah: number;
    text: string;
    translation: string;
    surahName: string;
    normalized: string;
  }[] = [];
  private initialized: boolean = false;

  private constructor() {
    // Don't initialize in constructor - do it lazily
  }

  static getInstance(): QuranMatchingService {
    if (!QuranMatchingService.instance) {
      QuranMatchingService.instance = new QuranMatchingService();
    }
    return QuranMatchingService.instance;
  }

  private initializeData() {
    if (this.initialized) {
      return; // Already initialized
    }

    try {
      this.normalizedQuran = [];

      // Lazy load JSON files using require
      const quranArabic = require('@/data/quran/quran-arabic.json');
      const quranEnglish = require('@/data/quran/quran-english.json');
      const surahInfo = require('@/data/quran/quran-surah-english.json');

      // Validate data exists
      if (!surahInfo || !Array.isArray(surahInfo)) {
        console.error('QuranMatchingService: surahInfo is invalid');
        return;
      }
      if (!quranArabic || typeof quranArabic !== 'object') {
        console.error('QuranMatchingService: quranArabic is invalid');
        return;
      }
      if (!quranEnglish || typeof quranEnglish !== 'object') {
        console.error('QuranMatchingService: quranEnglish is invalid');
        return;
      }

      const surahList = surahInfo as any[];
      const arabicData = quranArabic as Record<string, any[]>;
      const englishData = quranEnglish as Record<string, any[]>;

      console.log(`📚 Loading Quran data: ${surahList.length} surahs`);

      surahList.forEach(surah => {
        if (!surah || !surah.id) {
          console.warn('QuranMatchingService: Invalid surah entry', surah);
          return;
        }

        const surahId = surah.id;
        const arabicVerses = arabicData[String(surahId)] || [];
        const englishVerses = englishData[String(surahId)] || [];

        arabicVerses.forEach((verse: any, index: number) => {
          if (!verse || !verse.text) {
            console.warn(`QuranMatchingService: Invalid verse in surah ${surahId}`);
            return;
          }

          // Verify alignment by verse number, otherwise find the matching verse
          let translationText = '';
          const englishVerse = englishVerses[index];

          if (englishVerse && englishVerse.verse === verse.verse) {
            translationText = englishVerse.text || '';
          } else {
            const found = englishVerses.find(
              (v: any) => v && v.verse === verse.verse
            );
            translationText = found ? found.text || '' : '';
          }

          this.normalizedQuran.push({
            surah: surahId,
            ayah: verse.verse,
            text: verse.text,
            translation: translationText,
            surahName: surah.transliteration || 'Unknown',
            normalized: this.normalizeText(verse.text),
          });
        });
      });
      console.log(
        `QuranMatchingService: Indexed ${this.normalizedQuran.length} ayahs.`
      );

      // Show first and last ayah for verification
      if (this.normalizedQuran.length > 0) {
        const first = this.normalizedQuran[0];
        const last = this.normalizedQuran[this.normalizedQuran.length - 1];
        console.log(`📖 First ayah: ${first.surahName} ${first.surah}:${first.ayah} - "${first.text.substring(0, 30)}..."`);
        console.log(`📖 Last ayah: ${last.surahName} ${last.surah}:${last.ayah} - "${last.text.substring(0, 30)}..."`);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Quran data:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
    }
  }

  /**
   * Normalize Arabic text for searching
   * Removes diacritics (tashkeel), normalizes Alefs, etc.
   */
  normalizeText(text: string): string {
    return text
      .replace(/([^\u0621-\u063A\u0641-\u064A\u0660-\u0669a-zA-Z 0-9])/g, '') // Remove diacritics
      .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // Normalize Alef
      .replace(/[\u0649]/g, '\u064A') // Alef Maqsura to Ya
      .replace(/[\u0629]/g, '\u0647') // Ta Marbuta to Ha
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();
  }

  /**
   * Find all matches above the threshold
   */
  findAllMatches(query: string, threshold: number = 0.6): QuranMatch[] {
    // Ensure data is initialized
    this.initializeData();

    if (!query || query.length < 5) {
      console.log(`⚠️ Query too short (${query?.length || 0} chars): "${query}"`);
      return [];
    }

    const normalizedQuery = this.normalizeText(query);
    console.log(`🔍 Searching for: "${query}"`);
    console.log(`🔍 Normalized: "${normalizedQuery}"`);
    console.log(`🔍 Query length: ${query.length}, Normalized length: ${normalizedQuery.length}`);

    const matches: QuranMatch[] = [];
    let topScores: { score: number; surah: number; ayah: number; text: string }[] = [];

    for (const item of this.normalizedQuran) {
      const score = this.calculateSimilarity(normalizedQuery, item.normalized);

      if (score >= threshold) {
        matches.push({
          surahNumber: item.surah,
          ayahNumber: item.ayah,
          text: item.text,
          translation: item.translation,
          surahName: item.surahName,
          similarity: score,
        });
      }

      // Track top 5 scores for debugging
      topScores.push({ score, surah: item.surah, ayah: item.ayah, text: item.text });
    }

    // Sort by similarity descending
    const sortedMatches = matches.sort((a, b) => b.similarity - a.similarity);

    // Log top 5 scores
    topScores.sort((a, b) => b.score - a.score);
    console.log('📊 Top 5 similarity scores:');
    topScores.slice(0, 5).forEach((item, i) => {
      console.log(`  ${i + 1}. Score: ${item.score.toFixed(3)} - Surah ${item.surah}:${item.ayah} - "${item.text.substring(0, 50)}..."`);
    });

    if (sortedMatches.length > 0) {
      console.log(`✅ Found ${sortedMatches.length} matches above threshold ${threshold}`);
    } else {
      console.log(`❌ No matches found above threshold ${threshold}`);
    }

    return sortedMatches;
  }

  /**
   * Find the best match for the given text
   */
  findBestMatch(query: string): QuranMatch | null {
    // Lowered threshold to 0.3 to handle imperfect transcriptions
    const matches = this.findAllMatches(query, 0.3);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Check if the query has multiple potential matches (ambiguous)
   */
  isAmbiguous(query: string, threshold: number = 0.6): boolean {
    const matches = this.findAllMatches(query, threshold);
    // Consider ambiguous if there are multiple matches with similar scores
    if (matches.length < 2) return false;

    const topScore = matches[0].similarity;
    const secondScore = matches[1].similarity;
    // If the difference between top two matches is less than 0.15, it's ambiguous
    return (topScore - secondScore) < 0.15;
  }

  /**
   * Calculate similarity score (0 to 1)
   * Simple Jaccard index of words or substring check
   */
  private calculateSimilarity(query: string, target: string): number {
    // Avoid matching very short targets (like "الٓمٓ") with high scores
    // Only use substring matching if both query and target are substantial
    if (query.length > 10 && target.length > 10) {
      if (target.includes(query)) return 1.0;
      if (query.includes(target)) return 1.0;
    }

    // Tokenize
    const queryTokens = new Set(query.split(' ').filter(t => t.length > 0));
    const targetTokens = new Set(target.split(' ').filter(t => t.length > 0));

    // Avoid division by zero
    if (queryTokens.size === 0 || targetTokens.size === 0) {
      return 0.0;
    }

    // Intersection
    let intersection = 0;
    queryTokens.forEach(token => {
      if (targetTokens.has(token)) intersection++;
    });

    const union = new Set([
      ...Array.from(queryTokens),
      ...Array.from(targetTokens),
    ]).size;

    // Jaccard Similarity
    return intersection / union;
  }
}
