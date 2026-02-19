import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/middleware/auth.middleware';
import { bookmarkService } from '@/lib/services/bookmark.service';
import { handleError, successResponse } from '@/lib/utils/errors';

// DELETE /api/bookmarks/:id — remove a bookmark
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await authenticateRequest(req);
    const { id } = await params;
    await bookmarkService.removeBookmark(decoded.userId, id);
    return successResponse({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
