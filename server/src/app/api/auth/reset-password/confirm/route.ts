import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/services/auth.service';
import { handleError, successResponse } from '@/lib/utils/errors';

const confirmResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = confirmResetSchema.parse(body);

    // Reset password
    await authService.resetPassword(token, newPassword);

    return successResponse({
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    return handleError(error);
  }
}
