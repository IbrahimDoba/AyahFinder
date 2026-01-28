import OpenAI from "openai";
import { OPENAI_CONFIG } from "@/lib/config/constants";
import fs from "fs";
import path from "path";

// if (!process.env.OPENAI_API_KEY) {
//   throw new Error('OPENAI_API_KEY environment variable is not set');
// }

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

export interface VerseMatch {
  surahNumber: number;
  ayahNumber: number;
  confidence: number;
  explanation: string;
}

class OpenAIService {
  /**
   * Transcribe audio file using Whisper API
   */
  async transcribeAudio(
    audioFile: File | Buffer,
    filename: string = "audio.m4a",
  ): Promise<TranscriptionResult> {
    try {
      // Convert File to Buffer if needed
      let buffer: Buffer;
      if (audioFile instanceof File) {
        buffer = Buffer.from(await audioFile.arrayBuffer());
      } else {
        buffer = audioFile;
      }

      console.log(
        `🎤 Transcribing audio buffer (${buffer.length} bytes) with Whisper...`,
      );

      // Create a temporary file for OpenAI (they need a file-like object)
      const tempFile = new File([new Uint8Array(buffer)], filename, {
        type: "audio/m4a",
      });

      const whisperPrompt = "Quranic recitation, Arabic surah and ayah.";

      // Transcribe with Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: tempFile as any,
        model: OPENAI_CONFIG.WHISPER_MODEL,
        language: "ar", // Force Arabic language detection
        prompt: whisperPrompt,
        response_format: "verbose_json",
        temperature: 0,
      });

      // If Whisper echoes the prompt or returns very short text for a long buffer, it might be an issue
      if (
        transcription.text === whisperPrompt ||
        (transcription.text.length < 5 && buffer.length > 5000)
      ) {
        console.warn(
          "⚠️ Whisper returned prompt or suspicious result. Speech might be too quiet.",
        );
      }

      console.log("✅ Transcription:", transcription.text);

      return {
        text: transcription.text,
        language: (transcription as any).language,
        duration: (transcription as any).duration,
      };
    } catch (error) {
      console.error("❌ Whisper transcription error:", error);
      throw new Error(
        `Audio transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Match transcribed text to a Quran verse using GPT-4o-mini
   */
  async matchVerse(transcribedText: string): Promise<VerseMatch | null> {
    try {
      console.log("🤖 Matching verse with GPT-4o-mini...");

      const prompt = `You are an expert in the Quran. A user has recited a verse, and the audio was transcribed to Arabic text (which may contain errors or missing words).

Transcribed text: "${transcribedText}"

Your task:
1. Identify which Surah (chapter) and Ayah (verse) this transcription most likely corresponds to
2. Be flexible with transcription errors, missing words, or slight variations
3. Provide a confidence score (0-100) for your match
4. Briefly explain why you chose this verse

Respond ONLY with valid JSON in this exact format:
{
  "surahNumber": <number 1-114>,
  "ayahNumber": <number>,
  "confidence": <number 0-100>,
  "explanation": "<brief explanation>"
}

If you cannot find a confident match (confidence < 30), respond with:
{
  "surahNumber": null,
  "ayahNumber": null,
  "confidence": 0,
  "explanation": "Could not find a confident match"
}`;

      const completion = await openai.chat.completions.create({
        model: OPENAI_CONFIG.GPT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a Quran expert who identifies verses from transcribed Arabic text. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: OPENAI_CONFIG.TEMPERATURE,
        max_tokens: OPENAI_CONFIG.MAX_TOKENS,
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("No response from GPT");
      }

      console.log("🤖 GPT Response:", responseText);

      // Parse JSON response
      const result = JSON.parse(responseText);

      // Validate response structure
      if (
        result.surahNumber === undefined ||
        result.ayahNumber === undefined ||
        result.confidence === undefined
      ) {
        console.warn("⚠️ Invalid GPT response structure:", result);
        return null;
      }

      // Check confidence threshold
      if (result.confidence < OPENAI_CONFIG.CONFIDENCE_THRESHOLD) {
        console.log(`⚠️ Confidence too low: ${result.confidence}%`);
        return null;
      }

      console.log(
        `✅ Match found: Surah ${result.surahNumber}, Ayah ${result.ayahNumber} (${result.confidence}% confidence)`,
      );

      return {
        surahNumber: result.surahNumber,
        ayahNumber: result.ayahNumber,
        confidence: result.confidence,
        explanation: result.explanation || "",
      };
    } catch (error) {
      console.error("❌ GPT verse matching error:", error);
      throw new Error(
        `Verse matching failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Complete recognition pipeline: transcribe + match
   */
  async recognizeVerse(
    audioFile: File | Buffer,
    filename?: string,
  ): Promise<{
    transcription: string;
    match: VerseMatch | null;
  }> {
    // Step 1: Transcribe audio
    const transcription = await this.transcribeAudio(audioFile, filename);

    // Step 2: Match verse
    const match = await this.matchVerse(transcription.text);

    return {
      transcription: transcription.text,
      match,
    };
  }
}

export const openAIService = new OpenAIService();
