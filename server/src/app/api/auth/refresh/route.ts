import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/services/auth.service';
import { handleError, successResponse } from '@/lib/utils/errors';

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = refreshSchema.parse(body);

    // Refresh access token
    const result = await authService.refreshAccessToken(refreshToken);

    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
