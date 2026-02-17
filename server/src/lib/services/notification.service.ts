import { db } from '@/lib/db/client';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Send push notifications via Expo's push service
 */
async function sendPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Expo recommends batches of max 100
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();
      const tickets: ExpoPushTicket[] = result.data ?? [];

      // Log any errors but don't throw — partial failures are acceptable
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error') {
          const token = chunk[i]?.to;
          console.error(`[Notifications] Failed to send to ${token}:`, ticket.message);

          // If the token is invalid/not registered, remove it from DB
          if (
            ticket.details?.error === 'DeviceNotRegistered' ||
            ticket.details?.error === 'InvalidCredentials'
          ) {
            db.pushToken.delete({ where: { token: token ?? '' } }).catch(() => {});
          }
        }
      });
    } catch (err) {
      console.error('[Notifications] Expo push send failed:', err);
    }
  }
}

/**
 * Send Ayah of the Day to all opted-in users
 */
export async function sendDailyAyahNotification(
  arabicText: string,
  translation: string,
  surahName: string,
  surahNumber: number,
  ayahNumber: number
): Promise<{ sent: number }> {
  const tokens = await db.pushToken.findMany({
    where: { ayahOfDayEnabled: true },
    select: { token: true },
  });

  if (tokens.length === 0) return { sent: 0 };

  const messages: ExpoPushMessage[] = tokens.map(({ token }) => ({
    to: token,
    title: `Ayah of the Day — ${surahName} ${surahNumber}:${ayahNumber}`,
    body: translation.length > 120 ? translation.slice(0, 117) + '...' : translation,
    data: { type: 'ayah_of_day', surahNumber, ayahNumber },
    sound: 'default',
    channelId: 'ayahfinder',
  }));

  await sendPushNotifications(messages);
  return { sent: messages.length };
}

/**
 * Send Quran reading reminders to users whose reminder time matches the current hour (UTC-aware)
 * Called by cron — pass in the current "HH:MM" string to match against stored preferences
 */
export async function sendReadingReminders(timeSlot: string): Promise<{ sent: number }> {
  const tokens = await db.pushToken.findMany({
    where: {
      readingReminderEnabled: true,
      readingReminderTime: timeSlot,
    },
    select: { token: true },
  });

  if (tokens.length === 0) return { sent: 0 };

  const messages: ExpoPushMessage[] = tokens.map(({ token }) => ({
    to: token,
    title: 'Time to Read Quran',
    body: 'Your daily reading reminder — open AyahFind and reflect on the words of Allah.',
    data: { type: 'reading_reminder' },
    sound: 'default',
    channelId: 'ayahfinder',
  }));

  await sendPushNotifications(messages);
  return { sent: messages.length };
}

export const notificationService = {
  sendDailyAyahNotification,
  sendReadingReminders,
};
