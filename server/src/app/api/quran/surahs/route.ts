import { NextRequest } from "next/server";
import { quranService } from "@/lib/services/quran.service";
import { handleError, successResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    console.log("[API] GET /api/quran/surahs hit");
    const surahs = await quranService.getAllSurahs();
    console.log(`[API] Returning ${surahs.length} surahs`);
    return successResponse({ surahs });
  } catch (error) {
    console.error("[API] GET /api/quran/surahs error:", error);
    return handleError(error);
  }
}
