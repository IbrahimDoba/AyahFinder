/**
 * Bookmark Store
 * In-memory state synced with the server.
 * Requires the user to be authenticated — anonymous users get empty state.
 */
import { create } from 'zustand';
import bookmarkService, {
  Bookmark,
  AddBookmarkPayload,
} from '@/services/bookmarks/BookmarkService';

interface BookmarkState {
  bookmarks: Bookmark[];
  total: number;
  limit: number;
  remaining: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadBookmarks: () => Promise<void>;
  addBookmark: (payload: AddBookmarkPayload) => Promise<{ error?: string }>;
  removeBookmark: (id: string) => Promise<void>;
  isBookmarked: (surahNumber: number, ayahNumber: number) => boolean;
  getBookmarkId: (surahNumber: number, ayahNumber: number) => string | null;
  clearBookmarks: () => void;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  total: 0,
  limit: 5,
  remaining: 5,
  isLoading: false,
  error: null,

  loadBookmarks: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await bookmarkService.getBookmarks();
      set({
        bookmarks: data.bookmarks,
        total: data.total,
        limit: data.limit,
        remaining: data.remaining,
      });
    } catch (err: any) {
      set({ error: err.message ?? 'Failed to load bookmarks' });
    } finally {
      set({ isLoading: false });
    }
  },

  addBookmark: async (payload: AddBookmarkPayload) => {
    // Optimistic update — change the icon instantly
    const tempId = `temp_${Date.now()}`;
    const tempBookmark: Bookmark = {
      id: tempId,
      surahNumber: payload.surahNumber,
      surahName: payload.surahName,
      ayahNumber: payload.ayahNumber,
      arabicText: payload.arabicText,
      translation: payload.translation ?? null,
      createdAt: new Date().toISOString(),
    };

    set(state => ({
      bookmarks: [tempBookmark, ...state.bookmarks],
      total: state.total + 1,
      remaining: Math.max(0, state.remaining - 1),
    }));

    try {
      const { bookmark, remaining } = await bookmarkService.addBookmark(payload);
      // Swap temp entry with the real server bookmark
      set(state => ({
        bookmarks: state.bookmarks.map(b => (b.id === tempId ? bookmark : b)),
        remaining,
      }));
      return {};
    } catch (err: any) {
      // Roll back the optimistic update
      set(state => ({
        bookmarks: state.bookmarks.filter(b => b.id !== tempId),
        total: state.total - 1,
        remaining: state.remaining + 1,
      }));
      const msg: string =
        err?.response?.data?.error ?? err.message ?? 'Failed to add bookmark';
      return { error: msg };
    }
  },

  removeBookmark: async (id: string) => {
    // Optimistic removal
    const prev = get().bookmarks;
    set(state => ({
      bookmarks: state.bookmarks.filter(b => b.id !== id),
      total: state.total - 1,
      remaining: state.remaining + 1,
    }));
    try {
      await bookmarkService.removeBookmark(id);
    } catch {
      // Roll back on failure
      set({ bookmarks: prev, total: prev.length });
    }
  },

  isBookmarked: (surahNumber, ayahNumber) =>
    get().bookmarks.some(
      b => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
    ),

  getBookmarkId: (surahNumber, ayahNumber) =>
    get().bookmarks.find(
      b => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
    )?.id ?? null,

  clearBookmarks: () =>
    set({ bookmarks: [], total: 0, remaining: 5, error: null }),
}));
