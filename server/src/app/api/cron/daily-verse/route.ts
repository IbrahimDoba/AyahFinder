import { NextRequest } from 'next/server';
import { quranService } from '@/lib/services/quran.service';
import { notificationService } from '@/lib/services/notification.service';
import { successResponse, handleError } from '@/lib/utils/errors';

// Surah lengths — total 6236 verses across 114 surahs
// Used to map a day-of-year index to a specific surah:ayah
const SURAH_LENGTHS = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,
  64,77,227,93,73,98,60,54,45,83,54,53,59,37,35,38,29,36,45,25,43,35,38,29,18,45,60,
  49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,
  46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6
];

function getDailyVerseIndex(): { surahNumber: number; ayahNumber: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)); // 1-365

  // Map day to a verse index across all 6236 verses
  const totalVerses = SURAH_LENGTHS.reduce((a, b) => a + b, 0); // 6236
  const verseIndex = dayOfYear % totalVerses;

  let cumulative = 0;
  for (let i = 0; i < SURAH_LENGTHS.length; i++) {
    cumulative += SURAH_LENGTHS[i];
    if (verseIndex < cumulative) {
      const surahNumber = i + 1;
      const ayahNumber = verseIndex - (cumulative - SURAH_LENGTHS[i]) + 1;
      return { surahNumber, ayahNumber };
    }
  }

  return { surahNumber: 1, ayahNumber: 1 };
}

export async function GET(req: NextRequest) {
  try {
    // Protect with Vercel cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { surahNumber, ayahNumber } = getDailyVerseIndex();
    const verse = await quranService.getVerse(surahNumber, ayahNumber);

    if (!verse) {
      return new Response('Verse not found', { status: 500 });
    }

    const result = await notificationService.sendDailyAyahNotification(
      verse.arabicText,
      verse.englishTranslation,
      verse.surahName,
      surahNumber,
      ayahNumber
    );

    console.log(`[Cron] Daily Ayah sent — ${surahNumber}:${ayahNumber} to ${result.sent} devices`);
    return successResponse({ ...result, surahNumber, ayahNumber });
  } catch (error) {
    return handleError(error);
  }
}
