import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/services/auth.service';
import { emailService } from '@/lib/services/email.service';
import { handleError, successResponse } from '@/lib/utils/errors';

const resendSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = resendSchema.parse(body);

    // Resend verification email
    const verificationToken = await authService.resendVerificationEmail(email);

    // Send verification email
    await emailService.sendVerificationEmail(email, verificationToken);

    return successResponse({
      message: 'Verification email has been sent. Please check your inbox.',
    });
  } catch (error) {
    return handleError(error);
  }
}
