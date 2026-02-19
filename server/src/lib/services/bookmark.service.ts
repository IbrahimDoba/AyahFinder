import { db } from '@/lib/db/client';
import { BOOKMARK_LIMITS } from '@/lib/config/constants';
import { AppError } from '@/lib/utils/errors';

export interface BookmarkData {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabicText: string;
  translation?: string;
}

export interface BookmarkResponse {
  id: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabicText: string;
  translation: string | null;
  createdAt: Date;
}

export interface BookmarkListResponse {
  bookmarks: BookmarkResponse[];
  total: number;
  limit: number;
  remaining: number;
}

class BookmarkService {
  /**
   * Get the bookmark limit for a given subscription tier
   */
  private getLimit(tier: string): number {
    if (tier === 'premium') return BOOKMARK_LIMITS.PREMIUM;
    return BOOKMARK_LIMITS.FREE;
  }

  /**
   * Get all bookmarks for a user
   */
  async getBookmarks(userId: string, tier: string): Promise<BookmarkListResponse> {
    const bookmarks = await db.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const limit = this.getLimit(tier);

    return {
      bookmarks: bookmarks.map(b => ({
        id: b.id,
        surahNumber: b.surahNumber,
        surahName: b.surahName,
        ayahNumber: b.ayahNumber,
        arabicText: b.arabicText,
        translation: b.translation,
        createdAt: b.createdAt,
      })),
      total: bookmarks.length,
      limit,
      remaining: Math.max(0, limit - bookmarks.length),
    };
  }

  /**
   * Add a bookmark — enforces tier limit
   */
  async addBookmark(userId: string, tier: string, data: BookmarkData): Promise<{
    bookmark: BookmarkResponse;
    remaining: number;
  }> {
    const limit = this.getLimit(tier);

    // Check current count
    const count = await db.bookmark.count({ where: { userId } });

    if (count >= limit) {
      throw new AppError(
        403,
        tier === 'premium'
          ? `You've reached the maximum of ${BOOKMARK_LIMITS.PREMIUM} bookmarks.`
          : `Free plan allows up to ${BOOKMARK_LIMITS.FREE} bookmarks. Upgrade to Premium for up to ${BOOKMARK_LIMITS.PREMIUM}.`,
        'BOOKMARK_LIMIT_REACHED'
      );
    }

    // Upsert to handle duplicate gracefully (already bookmarked)
    const bookmark = await db.bookmark.upsert({
      where: {
        userId_surahNumber_ayahNumber: {
          userId,
          surahNumber: data.surahNumber,
          ayahNumber: data.ayahNumber,
        },
      },
      create: {
        userId,
        surahNumber: data.surahNumber,
        surahName: data.surahName,
        ayahNumber: data.ayahNumber,
        arabicText: data.arabicText,
        translation: data.translation ?? null,
      },
      update: {}, // Already exists — no-op update
    });

    const newCount = await db.bookmark.count({ where: { userId } });

    return {
      bookmark: {
        id: bookmark.id,
        surahNumber: bookmark.surahNumber,
        surahName: bookmark.surahName,
        ayahNumber: bookmark.ayahNumber,
        arabicText: bookmark.arabicText,
        translation: bookmark.translation,
        createdAt: bookmark.createdAt,
      },
      remaining: Math.max(0, limit - newCount),
    };
  }

  /**
   * Remove a bookmark — only the owner can delete
   */
  async removeBookmark(userId: string, bookmarkId: string): Promise<void> {
    const bookmark = await db.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark) {
      throw new AppError(404, 'Bookmark not found', 'NOT_FOUND');
    }

    if (bookmark.userId !== userId) {
      throw new AppError(403, 'Access denied', 'AUTHORIZATION_ERROR');
    }

    await db.bookmark.delete({ where: { id: bookmarkId } });
  }
}

export const bookmarkService = new BookmarkService();
