import { NextRequest } from "next/server";
import { quranService } from "@/lib/services/quran.service";
import {
  handleError,
  successResponse,
  NotFoundError,
} from "@/lib/utils/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ surahId: string; ayahId: string }> },
) {
  try {
    const { surahId, ayahId } = await params;
    const surahNumber = parseInt(surahId);
    const ayahNumber = parseInt(ayahId);

    if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      throw new NotFoundError(
        "Invalid surah number. Must be between 1 and 114.",
      );
    }

    if (isNaN(ayahNumber) || ayahNumber < 1) {
      throw new NotFoundError("Invalid ayah number.");
    }

    const verse = await quranService.getVerse(surahNumber, ayahNumber);

    if (!verse) {
      throw new NotFoundError("Verse not found");
    }

    return successResponse({ verse });
  } catch (error) {
    return handleError(error);
  }
}
