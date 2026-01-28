import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/services/auth.service';
import { emailService } from '@/lib/services/email.service';
import { handleError, successResponse } from '@/lib/utils/errors';
import { db } from '@/lib/db/client';

const verifySchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = verifySchema.parse(body);

    // Get user email before verification (for welcome email)
    const user = await db.user.findFirst({
      where: { verificationToken: token },
    });

    // Verify email
    await authService.verifyEmail(token);

    // Send welcome email
    if (user) {
      await emailService.sendWelcomeEmail(user.email, user.displayName || undefined);
    }

    return successResponse({
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    return handleError(error);
  }
}
