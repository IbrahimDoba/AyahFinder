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
      const stats = await usageService.getUserUsageStats(user.userId);
      return successResponse(stats);
    } else {
      // Anonymous user - get device ID
      const deviceId = extractDeviceId(req);

      if (!deviceId) {
        return handleError(new Error('Device ID is required for anonymous users'));
      }

      const stats = await usageService.getAnonymousUsageStats(deviceId);
      return successResponse(stats);
    }
  } catch (error) {
    return handleError(error);
  }
}
