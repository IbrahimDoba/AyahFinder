import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/services/auth.service';
import { emailService } from '@/lib/services/email.service';
import { handleError, successResponse } from '@/lib/utils/errors';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    // Register user
    const { userId, verificationToken } = await authService.register(validatedData);

    // Send verification email
    await emailService.sendVerificationEmail(validatedData.email, verificationToken);

    return successResponse({
      message: 'Registration successful. Please check your email to verify your account.',
      userId,
    }, 201);
  } catch (error) {
    return handleError(error);
  }
}
