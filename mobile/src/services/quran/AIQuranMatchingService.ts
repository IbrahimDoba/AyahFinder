/**
 * AI-Based Quran Matching Service
 * Uses OpenAI GPT to intelligently match transcriptions to Quran verses
 */
import { API_KEYS } from '@/constants/apiKeys';

export interface AIMatchResult {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  confidence: number;
  matchedText: string;
  explanation?: string;
}

export class AIQuranMatchingService {
  private static instance: AIQuranMatchingService;
  private apiKey: string;

  private constructor() {
    this.apiKey = API_KEYS.OPENAI_API_KEY;
  }

  static getInstance(): AIQuranMatchingService {
    if (!AIQuranMatchingService.instance) {
      AIQuranMatchingService.instance = new AIQuranMatchingService();
    }
    return AIQuranMatchingService.instance;
  }

  /**
   * Use AI to identify which Surah and Ayah the transcription matches
   */
  async identifyVerse(transcription: string): Promise<AIMatchResult | null> {
    try {
      console.log('🤖 Using AI to identify verse from transcription...');

      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Create the prompt for GPT
      const prompt = `You are a Quran verse identifier. Given an Arabic transcription that may contain errors, identify which Surah (chapter) and Ayah (verse) from the Quran it matches.

Transcription: "${transcription}"

Instructions:
1. Analyze the transcription carefully, considering that it may have transcription errors or missing words
2. Identify the most likely Surah number (1-114) and Ayah number
3. Consider context clues like repeated words, key phrases, or distinctive patterns
4. Provide a confidence score (0-100)

Respond ONLY with valid JSON in this exact format:
{
  "surahNumber": <number>,
  "ayahNumber": <number>,
  "confidence": <number 0-100>,
  "explanation": "<brief explanation of why you think this is the match>"
}

If you cannot identify a match with at least 30% confidence, respond with:
{
  "surahNumber": 0,
  "ayahNumber": 0,
  "confidence": 0,
  "explanation": "Cannot identify verse from this transcription"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert in Quran verses. You help identify Quran verses from Arabic transcriptions.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from GPT');
      }

      console.log('🤖 GPT Response:', content);

      // Parse the JSON response
      const match = JSON.parse(content);

      if (match.surahNumber === 0 || match.confidence < 30) {
        console.log('❌ AI could not identify verse with sufficient confidence');
        return null;
      }

      // Load surah info for the name
      const surahsData = require('@/data/quran/quran-surah-english.json');
      const surahInfo = surahsData.find((s: any) => s.id === match.surahNumber);

      // Load the actual Arabic text
      const quranArabic = require('@/data/quran/quran-arabic.json');
      const surahVerses = quranArabic[match.surahNumber.toString()];
      const verse = surahVerses?.find((v: any) => v.verse === match.ayahNumber);

      const result: AIMatchResult = {
        surahNumber: match.surahNumber,
        ayahNumber: match.ayahNumber,
        surahName: surahInfo?.transliteration || `Surah ${match.surahNumber}`,
        confidence: match.confidence / 100, // Convert to 0-1 scale
        matchedText: verse?.text || '',
        explanation: match.explanation,
      };

      console.log(`✅ AI Match: ${result.surahName} ${result.ayahNumber} (${match.confidence}% confidence)`);
      console.log(`📖 ${result.explanation}`);

      return result;
    } catch (error) {
      console.error('AI matching error:', error);
      return null;
    }
  }
}
