import { NextRequest } from "next/server";
import { quranService } from "@/lib/services/quran.service";
import {
  handleError,
  successResponse,
  NotFoundError,
} from "@/lib/utils/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const surahNumber = parseInt(resolvedParams.id);

    if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      throw new NotFoundError(
        "Invalid surah number. Must be between 1 and 114.",
      );
    }

    const result = await quranService.getSurah(surahNumber);

    if (!result) {
      throw new NotFoundError("Surah not found");
    }

    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
