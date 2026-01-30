import { NextRequest } from "next/server";
import {
  optionalAuth,
  extractDeviceId,
} from "@/lib/middleware/auth.middleware";
import { openAIService } from "@/lib/services/openai.service";
import { quranService } from "@/lib/services/quran.service";
import { usageService } from "@/lib/services/usage.service";
import {
  handleError,
  successResponse,
  RateLimitError,
} from "@/lib/utils/errors";
import { AUDIO_CONFIG } from "@/lib/config/constants";
import { db } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let user = null;
  let deviceId = null;

  try {
    // Check if user is authenticated or get device ID
    user = await optionalAuth(req);
    deviceId = extractDeviceId(req);
    const userId = user?.userId;

    // Validate usage limits
    let canSearch;
    if (userId) {
      canSearch = await usageService.canUserSearch(userId);
    } else if (deviceId) {
      canSearch = await usageService.canAnonymousSearch(deviceId);
    } else {
      return handleError(new Error("Authentication or device ID required"));
    }

    if (!canSearch.allowed) {
      throw new RateLimitError(canSearch.reason || "Usage limit exceeded");
    }

    // Get audio file from FormData
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return handleError(new Error("No audio file provided"));
    }

    // Validate file size
    if (audioFile.size > AUDIO_CONFIG.MAX_SIZE_BYTES) {
      return handleError(
        new Error(
          `Audio file too large. Maximum size is ${AUDIO_CONFIG.MAX_SIZE_MB}MB`,
        ),
      );
    }

    // Validate file type
    if (
      !(AUDIO_CONFIG.ALLOWED_FORMATS as readonly string[]).includes(
        audioFile.type,
      )
    ) {
      return handleError(
        new Error(
          `Invalid audio format. Allowed formats: ${AUDIO_CONFIG.ALLOWED_FORMATS.join(", ")}`,
        ),
      );
    }

    console.log("🎵 Processing audio recognition...");
    console.log(
      `File: ${audioFile.name}, Size: ${(audioFile.size / 1024).toFixed(2)} KB, Type: ${audioFile.type}`,
    );

    // Step 1: Transcribe audio with Whisper
    const transcription = await openAIService.transcribeAudio(
      audioFile,
      audioFile.name,
    );

    if (!transcription.text) {
      await saveRecognitionHistory({
        userId: userId || null,
        deviceId: deviceId || null,
        transcription: "",
        success: false,
        errorMessage: "Transcription failed",
        processingTimeMs: Date.now() - startTime,
      });

      return successResponse({
        success: false,
        message: "Could not transcribe audio. Please try again.",
        processingTimeMs: Date.now() - startTime,
      });
    }

    console.log(`📝 Transcription: "${transcription.text}"`);

    // Step 2: Match verse with GPT
    const match = await openAIService.matchVerse(transcription.text);

    if (!match || match.confidence < 30) {
      await saveRecognitionHistory({
        userId: userId || null,
        deviceId: deviceId || null,
        transcription: transcription.text,
        confidence: match?.confidence || 0,
        success: false,
        errorMessage: "No confident match found",
        processingTimeMs: Date.now() - startTime,
      });

      return successResponse({
        success: false,
        transcription: transcription.text,
        message:
          "Could not find a confident match. Please try recording again with clearer audio.",
        processingTimeMs: Date.now() - startTime,
      });
    }

    console.log(
      `🎯 Match: Surah ${match.surahNumber}, Ayah ${match.ayahNumber} (${match.confidence}% confidence)`,
    );

    // Step 3: Get full verse details from Quran data
    const verse = await quranService.getVerse(
      match.surahNumber,
      match.ayahNumber,
    );

    if (!verse) {
      await saveRecognitionHistory({
        userId: userId || null,
        deviceId: deviceId || null,
        transcription: transcription.text,
        surahNumber: match.surahNumber,
        ayahNumber: match.ayahNumber,
        confidence: match.confidence,
        success: false,
        errorMessage: "Verse not found in database",
        processingTimeMs: Date.now() - startTime,
      });

      return successResponse({
        success: false,
        transcription: transcription.text,
        message: "Verse not found in database.",
        processingTimeMs: Date.now() - startTime,
      });
    }

    // Step 4: Increment usage and get updated stats
    let updatedUsageStats;
    if (userId) {
      await usageService.incrementUserUsage(userId);
      updatedUsageStats = await usageService.getUserUsageStats(userId);
    } else if (deviceId) {
      await usageService.incrementAnonymousUsage(deviceId);
      updatedUsageStats = await usageService.getAnonymousUsageStats(deviceId);
    }

    // Step 5: Save to history
    await saveRecognitionHistory({
      userId: userId || null,
      deviceId: deviceId || null,
      transcription: transcription.text,
      surahNumber: match.surahNumber,
      ayahNumber: match.ayahNumber,
      confidence: match.confidence,
      success: true,
      processingTimeMs: Date.now() - startTime,
    });

    console.log(`✅ Recognition successful in ${Date.now() - startTime}ms`);

    return successResponse({
      success: true,
      transcription: transcription.text,
      match: {
        surahNumber: match.surahNumber,
        ayahNumber: match.ayahNumber,
        confidence: match.confidence,
        explanation: match.explanation,
      },
      verse: {
        arabicText: verse.arabicText,
        englishTranslation: verse.englishTranslation,
        surahName: verse.surahName,
        surahNameArabic: verse.surahNameArabic,
        surahTranslation: verse.surahTranslation,
        surahType: verse.surahType,
      },
      usage: updatedUsageStats || null,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("❌ Recognition error:", error);

    await saveRecognitionHistory({
      userId: (user as any)?.userId || null,
      deviceId: deviceId || null,
      transcription: "",
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      processingTimeMs: Date.now() - startTime,
    });

    return handleError(error);
  }
}

/**
 * Save recognition attempt to history
 */
async function saveRecognitionHistory(data: {
  userId: string | null;
  deviceId: string | null;
  transcription: string;
  surahNumber?: number;
  ayahNumber?: number;
  confidence?: number;
  success: boolean;
  errorMessage?: string;
  processingTimeMs: number;
}) {
  try {
    await db.recognitionHistory.create({
      data: {
        userId: data.userId || undefined,
        deviceId: data.deviceId || undefined,
        transcription: data.transcription,
        surahNumber: data.surahNumber || null,
        ayahNumber: data.ayahNumber || null,
        confidence: data.confidence || null,
        success: data.success,
        errorMessage: data.errorMessage || null,
        processingTimeMs: data.processingTimeMs,
      },
    });
  } catch (error) {
    console.error("Failed to save recognition history:", error);
    // Don't throw - this is non-critical
  }
}

// Configure Next.js to handle larger request bodies for audio uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
