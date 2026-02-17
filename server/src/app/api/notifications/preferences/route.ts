import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { authenticateRequest } from '@/lib/middleware/auth.middleware';
import { handleError, successResponse } from '@/lib/utils/errors';

const preferencesSchema = z.object({
  token: z.string().min(1, 'Push token is required'),
  ayahOfDayEnabled: z.boolean().optional(),
  readingReminderEnabled: z.boolean().optional(),
  readingReminderTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
    .optional()
    .nullable(),
});

/**
 * GET /api/notifications/preferences?token=...
 * Get notification preferences for a push token
 */
export async function GET(req: NextRequest) {
  try {
    await authenticateRequest(req);
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return successResponse({ preferences: null });
    }

    const record = await db.pushToken.findUnique({
      where: { token },
      select: {
        ayahOfDayEnabled: true,
        readingReminderEnabled: true,
        readingReminderTime: true,
      },
    });

    return successResponse({ preferences: record });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/notifications/preferences
 * Update notification preferences for a push token
 */
export async function PATCH(req: NextRequest) {
  try {
    await authenticateRequest(req);
    const body = await req.json();
    const { token, ...prefs } = preferencesSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (prefs.ayahOfDayEnabled !== undefined) updateData.ayahOfDayEnabled = prefs.ayahOfDayEnabled;
    if (prefs.readingReminderEnabled !== undefined) updateData.readingReminderEnabled = prefs.readingReminderEnabled;
    if ('readingReminderTime' in prefs) updateData.readingReminderTime = prefs.readingReminderTime;

    const updated = await db.pushToken.update({
      where: { token },
      data: updateData,
      select: {
        ayahOfDayEnabled: true,
        readingReminderEnabled: true,
        readingReminderTime: true,
      },
    });

    return successResponse({ preferences: updated });
  } catch (error) {
    return handleError(error);
  }
}
