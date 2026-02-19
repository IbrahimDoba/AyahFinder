import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/middleware/auth.middleware';
import { authService } from '@/lib/services/auth.service';
import { bookmarkService } from '@/lib/services/bookmark.service';
import { handleError, successResponse } from '@/lib/utils/errors';

// GET /api/bookmarks — list all bookmarks for authenticated user
export async function GET(req: NextRequest) {
  try {
    const decoded = await authenticateRequest(req);
    const user = await authService.getUserById(decoded.userId);
    if (!user) throw new Error('User not found');

    const result = await bookmarkService.getBookmarks(user.id, user.subscriptionTier);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/bookmarks — add a bookmark
export async function POST(req: NextRequest) {
  try {
    const decoded = await authenticateRequest(req);
    const user = await authService.getUserById(decoded.userId);
    if (!user) throw new Error('User not found');

    const body = await req.json();
    const { surahNumber, surahName, ayahNumber, arabicText, translation } = body;

    if (!surahNumber || !surahName || !ayahNumber || !arabicText) {
      throw new Error('surahNumber, surahName, ayahNumber and arabicText are required');
    }

    const result = await bookmarkService.addBookmark(user.id, user.subscriptionTier, {
      surahNumber,
      surahName,
      ayahNumber,
      arabicText,
      translation,
    });

    return successResponse(result, 201);
  } catch (error) {
    return handleError(error);
  }
}
