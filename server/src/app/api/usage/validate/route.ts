import { NextRequest } from 'next/server';
import { optionalAuth, extractDeviceId } from '@/lib/middleware/auth.middleware';
import { usageService } from '@/lib/services/usage.service';
import { handleError, successResponse } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await optionalAuth(req);

    if (user) {
      // Authenticated user
      const result = await usageService.canUserSearch(user.userId);
      return successResponse(result);
    } else {
      // Anonymous user - get device ID
      const deviceId = extractDeviceId(req);

      if (!deviceId) {
        return successResponse({
          allowed: false,
          remaining: 0,
          limit: 0,
          reason: 'Device ID is required for anonymous users',
        });
      }

      const result = await usageService.canAnonymousSearch(deviceId);
      return successResponse(result);
    }
  } catch (error) {
    return handleError(error);
  }
}
