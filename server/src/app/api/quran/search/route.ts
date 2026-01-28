import { NextRequest } from 'next/server';
import { quranService } from '@/lib/services/quran.service';
import { handleError, successResponse, ValidationError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    const language = searchParams.get('lang') || 'english';

    if (!query) {
      throw new ValidationError('Search query is required. Use ?q=your-search-term');
    }

    if (query.length < 3) {
      throw new ValidationError('Search query must be at least 3 characters long');
    }

    if (language !== 'english' && language !== 'arabic') {
      throw new ValidationError('Language must be either "english" or "arabic"');
    }

    const results = await quranService.searchVerses(query, language as 'english' | 'arabic');

    return successResponse({
      query,
      language,
      results,
      count: results.length,
    });
  } catch (error) {
    return handleError(error);
  }
}
