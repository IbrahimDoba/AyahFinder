import { NextRequest } from 'next/server';
import { optionalAuth, extractDeviceId } from '@/lib/middleware/auth.middleware';
import { usageService } from '@/lib/services/usage.service';
import { handleError, successResponse } from '@/lib/utils/errors';

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await optionalAuth(req);

    if (user) {
      // Authenticated user
      await usageService.incrementUserUsage(user.userId);
      return successResponse({ message: 'Usage incremented successfully' });
    } else {
      // Anonymous user - get device ID
      const deviceId = extractDeviceId(req);

      if (!deviceId) {
        return handleError(new Error('Device ID is required for anonymous users'));
      }

      await usageService.incrementAnonymousUsage(deviceId);
      return successResponse({ message: 'Usage incremented successfully' });
    }
  } catch (error) {
    return handleError(error);
  }
}
