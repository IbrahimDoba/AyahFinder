import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { authenticateRequest } from '@/lib/middleware/auth.middleware';
import { handleError, successResponse } from '@/lib/utils/errors';

const registerSchema = z.object({
  token: z.string().min(1, 'Push token is required'),
  platform: z.enum(['ios', 'android']),
});

/**
 * POST /api/notifications/register
 * Register or update a push token for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = await authenticateRequest(req);
    const body = await req.json();
    const { token, platform } = registerSchema.parse(body);

    // Upsert: if this token already exists update it, otherwise create
    await db.pushToken.upsert({
      where: { token },
      create: {
        userId: decoded.userId,
        token,
        platform,
      },
      update: {
        userId: decoded.userId,
        platform,
      },
    });

    return successResponse({ registered: true });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/notifications/register
 * Unregister a push token (e.g., on logout)
 */
export async function DELETE(req: NextRequest) {
  try {
    await authenticateRequest(req);
    const body = await req.json();
    const { token } = z.object({ token: z.string().min(1) }).parse(body);

    await db.pushToken.deleteMany({ where: { token } });

    return successResponse({ unregistered: true });
  } catch (error) {
    return handleError(error);
  }
}
