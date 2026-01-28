import fs from "fs";
import path from "path";

// Quran data types
interface QuranAyah {
  verse: number;
  text: string;
}

interface SurahMetadata {
  id: number;
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan";
}

interface Ayah {
  id: number; // Added id
  surahId: number; // Added surahId
  number: number;
  ayahNumber: number; // Added for clarity
  numberInSurah: number;
  text: string;
  arabicText: string; // Added for mobile compatibility
  translation: string;
}

interface SurahDetail extends SurahMetadata {
  ayahs: Ayah[];
  verses: Ayah[]; // Added for mobile compatibility
}

interface VerseDetail {
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  englishTranslation: string;
  surahName: string;
  surahNameArabic: string;
  surahTranslation: string;
  surahType: string;
  totalVerses: number;
}

class QuranService {
  private quranArabic: Map<number, QuranAyah[]> = new Map();
  private quranEnglish: Map<number, QuranAyah[]> = new Map();
  private surahsArabic: Map<number, any> = new Map();
  private surahsEnglish: Map<number, any> = new Map();
  private isLoaded = false;

  /**
   * Load Quran data from JSON files
   */
  private async loadData() {
    if (this.isLoaded) return;
    try {
      const dataPath = path.join(process.cwd(), "src", "data", "quran");

      // Load Arabic verses
      const arabicData = JSON.parse(
        fs.readFileSync(path.join(dataPath, "quran-arabic.json"), "utf-8"),
      );
      Object.entries(arabicData).forEach(([surahNum, ayahs]) => {
        this.quranArabic.set(parseInt(surahNum), ayahs as QuranAyah[]);
      });

      // Load English translations
      const englishData = JSON.parse(
        fs.readFileSync(path.join(dataPath, "quran-english.json"), "utf-8"),
      );
      Object.entries(englishData).forEach(([surahNum, ayahs]) => {
        this.quranEnglish.set(parseInt(surahNum), ayahs as QuranAyah[]);
      });

      // Load Surah metadata (Arabic)
      const surahArabicData = JSON.parse(
        fs.readFileSync(
          path.join(dataPath, "quran-surah-arabic.json"),
          "utf-8",
        ),
      );
      Object.values(surahArabicData).forEach((surah: any) => {
        // Use surah.id as the key, since 'number' doesn't exist in the JSON
        this.surahsArabic.set(surah.id, surah);
      });

      // Load Surah metadata (English)
      const surahEnglishData = JSON.parse(
        fs.readFileSync(
          path.join(dataPath, "quran-surah-english.json"),
          "utf-8",
        ),
      );
      Object.values(surahEnglishData).forEach((surah: any) => {
        // Use surah.id as the key, since 'number' doesn't exist in the JSON
        this.surahsEnglish.set(surah.id, surah);
      });

      this.isLoaded = true;
      console.log(`✅ Quran data loaded successfully:
        - Arabic Verses: ${this.quranArabic.size} surahs
        - English Verses: ${this.quranEnglish.size} surahs
        - Arabic Metadata: ${this.surahsArabic.size} surahs
        - English Metadata: ${this.surahsEnglish.size} surahs
      `);
    } catch (error) {
      console.error("❌ Error loading Quran data:", error);
      throw new Error("Failed to load Quran data");
    }
  }

  /**
   * Get a specific verse with all details
   */
  async getVerse(
    surahNumber: number,
    ayahNumber: number,
  ): Promise<VerseDetail | null> {
    await this.loadData();

    // Validate surah number
    if (surahNumber < 1 || surahNumber > 114) {
      return null;
    }

    // Get Arabic text
    const arabicAyahs = this.quranArabic.get(surahNumber);
    const arabicAyah = arabicAyahs?.find((a) => a.verse === ayahNumber);

    // Get English translation
    const englishAyahs = this.quranEnglish.get(surahNumber);
    const englishAyah = englishAyahs?.find((a) => a.verse === ayahNumber);

    // Get Surah metadata
    const surahArabic = this.surahsArabic.get(surahNumber);
    const surahEnglish = this.surahsEnglish.get(surahNumber);

    if (!arabicAyah || !englishAyah || !surahArabic || !surahEnglish) {
      return null;
    }

    return {
      surahNumber,
      ayahNumber,
      arabicText: arabicAyah.text,
      englishTranslation: englishAyah.text,
      surahName: surahEnglish.transliteration,
      surahNameArabic: surahArabic.name,
      surahTranslation: surahEnglish.translation,
      surahType:
        surahEnglish.type.charAt(0).toUpperCase() + surahEnglish.type.slice(1),
      totalVerses: surahEnglish.total_verses,
    };
  }

  /**
   * Get all surahs metadata
   */
  async getAllSurahs(): Promise<SurahMetadata[]> {
    await this.loadData();
    const surahs: SurahMetadata[] = [];
    for (let i = 1; i <= 114; i++) {
      const surahArabic = this.surahsArabic.get(i);
      const surahEnglish = this.surahsEnglish.get(i);
      if (surahArabic && surahEnglish) {
        surahs.push({
          id: i,
          number: i,
          name: surahArabic.name, // The Arabic name
          englishName: surahEnglish.transliteration,
          englishNameTranslation: surahEnglish.translation,
          numberOfAyahs: surahEnglish.total_verses,
          revelationType:
            surahEnglish.type.charAt(0).toUpperCase() +
            surahEnglish.type.slice(1),
        });
      }
    }
    console.log(`📚 Returning ${surahs.length} surahs to mobile`);
    return surahs;
  }

  /**
   * Get a specific surah with all its ayahs
   */
  async getSurah(number: number): Promise<SurahDetail | null> {
    await this.loadData();
    const surahArabic = this.surahsArabic.get(number);
    const surahEnglish = this.surahsEnglish.get(number);
    const versesArabic = this.quranArabic.get(number);
    const versesEnglish = this.quranEnglish.get(number);

    if (!surahArabic || !surahEnglish || !versesArabic || !versesEnglish) {
      return null;
    }

    const ayahs: Ayah[] = versesArabic.map((v, index) => ({
      id: index + 1,
      surahId: number,
      number: v.verse,
      ayahNumber: v.verse,
      numberInSurah: v.verse,
      text: v.text,
      arabicText: v.text,
      translation: versesEnglish[index]?.text || "",
    }));

    return {
      id: number,
      number,
      name: surahArabic.name,
      englishName: surahEnglish.transliteration,
      englishNameTranslation: surahEnglish.translation,
      revelationType:
        surahEnglish.type.charAt(0).toUpperCase() + surahEnglish.type.slice(1),
      numberOfAyahs: surahEnglish.total_verses,
      ayahs,
      verses: ayahs,
    };
  }

  /**
   * Search for verses containing a keyword (simple text search)
   */
  async searchVerses(
    query: string,
    language: "arabic" | "english" = "english",
  ): Promise<VerseDetail[]> {
    await this.loadData();

    const results: VerseDetail[] = [];
    const searchQuery = query.toLowerCase();

    for (let surahNum = 1; surahNum <= 114; surahNum++) {
      const arabicAyahs = this.quranArabic.get(surahNum);
      const englishAyahs = this.quranEnglish.get(surahNum);

      if (!arabicAyahs || !englishAyahs) continue;

      const ayahsToSearch = language === "arabic" ? arabicAyahs : englishAyahs;

      ayahsToSearch.forEach((ayah) => {
        const text = ayah.text;

        if (text.toLowerCase().includes(searchQuery)) {
          const verse = this.getVerseSync(surahNum, ayah.verse);
          if (verse) {
            results.push(verse);
          }
        }
      });

      // Limit results to avoid overwhelming response
      if (results.length >= 50) break;
    }

    return results;
  }

  /**
   * Synchronous version of getVerse (for use in search)
   */
  private getVerseSync(
    surahNumber: number,
    ayahNumber: number,
  ): VerseDetail | null {
    const arabicAyahs = this.quranArabic.get(surahNumber);
    const arabicAyah = arabicAyahs?.find((a) => a.verse === ayahNumber);

    const englishAyahs = this.quranEnglish.get(surahNumber);
    const englishAyah = englishAyahs?.find((a) => a.verse === ayahNumber);

    const surahArabic = this.surahsArabic.get(surahNumber);
    const surahEnglish = this.surahsEnglish.get(surahNumber);

    if (!arabicAyah || !englishAyah || !surahArabic || !surahEnglish) {
      return null;
    }

    return {
      surahNumber,
      ayahNumber,
      arabicText: arabicAyah.text,
      englishTranslation: englishAyah.text,
      surahName: surahEnglish.transliteration,
      surahNameArabic: surahArabic.name,
      surahTranslation: surahEnglish.translation,
      surahType:
        surahEnglish.type.charAt(0).toUpperCase() + surahEnglish.type.slice(1),
      totalVerses: surahEnglish.total_verses,
    };
  }
}

export const quranService = new QuranService();
