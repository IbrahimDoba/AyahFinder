import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/services/auth.service';
import { emailService } from '@/lib/services/email.service';
import { handleError, successResponse } from '@/lib/utils/errors';

const resetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = resetRequestSchema.parse(body);

    // Request password reset
    const resetToken = await authService.requestPasswordReset(email);

    // Send reset email (always send email even if user doesn't exist for security)
    await emailService.sendPasswordResetEmail(email, resetToken);

    return successResponse({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    return handleError(error);
  }
}
