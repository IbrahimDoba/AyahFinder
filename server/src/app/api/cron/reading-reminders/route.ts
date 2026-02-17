import { NextRequest } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';
import { successResponse, handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    // Protect with Vercel cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get current UTC hour:minute and check all matching reading reminders
    // We run every hour; match on "HH:00" (top-of-hour slots)
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const timeSlot = `${hh}:00`;

    const result = await notificationService.sendReadingReminders(timeSlot);
    console.log(`[Cron] Reading reminders sent for ${timeSlot} — ${result.sent} devices`);

    return successResponse({ ...result, timeSlot });
  } catch (error) {
    return handleError(error);
  }
}
