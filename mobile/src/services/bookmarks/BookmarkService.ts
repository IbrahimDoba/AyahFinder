/**
 * Bookmark Service
 * Handles all bookmark API calls to the server.
 */
import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';

export interface Bookmark {
  id: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabicText: string;
  translation: string | null;
  createdAt: string;
}

export interface BookmarkListResponse {
  bookmarks: Bookmark[];
  total: number;
  limit: number;
  remaining: number;
}

export interface AddBookmarkPayload {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabicText: string;
  translation?: string | null;
}

class BookmarkService {
  async getBookmarks(): Promise<BookmarkListResponse> {
    return apiClient.get<BookmarkListResponse>(ENDPOINTS.BOOKMARKS.LIST);
  }

  async addBookmark(payload: AddBookmarkPayload): Promise<{
    bookmark: Bookmark;
    remaining: number;
  }> {
    return apiClient.post(ENDPOINTS.BOOKMARKS.ADD, payload);
  }

  async removeBookmark(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.BOOKMARKS.REMOVE(id));
  }
}

const bookmarkService = new BookmarkService();
export default bookmarkService;
