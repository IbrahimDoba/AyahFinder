import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/middleware/auth.middleware';
import { authService } from '@/lib/services/auth.service';
import { handleError, successResponse } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    // Authenticate request
    const decoded = await authenticateRequest(req);

    // Get user
    const user = await authService.getUserById(decoded.userId);

    if (!user) {
      return handleError(new Error('User not found'));
    }

    return successResponse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      subscriptionTier: user.subscriptionTier,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (error) {
    return handleError(error);
  }
}
