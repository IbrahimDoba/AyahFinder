import { NextRequest } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/utils/jwt';
import { AuthenticationError } from '@/lib/utils/errors';

export interface AuthRequest extends NextRequest {
  user?: DecodedToken;
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and just "<token>"
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  return authHeader;
}

/**
 * Authenticate request and return decoded token
 * Throws AuthenticationError if authentication fails
 */
export async function authenticateRequest(req: NextRequest): Promise<DecodedToken> {
  const token = extractToken(req);

  if (!token) {
    throw new AuthenticationError('No authentication token provided');
  }

  try {
    const decoded = verifyToken(token);

    // Ensure it's an access token
    if (decoded.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof Error) {
      throw new AuthenticationError(error.message);
    }
    throw new AuthenticationError('Token verification failed');
  }
}

/**
 * Optional authentication - returns decoded token if present, null otherwise
 * Does not throw errors
 */
export async function optionalAuth(req: NextRequest): Promise<DecodedToken | null> {
  try {
    return await authenticateRequest(req);
  } catch {
    return null;
  }
}

/**
 * Check if user has premium subscription
 */
export function requiresPremium(user: DecodedToken): boolean {
  return user.subscriptionTier === 'premium';
}

/**
 * Extract device ID from headers (for anonymous users)
 */
export function extractDeviceId(req: NextRequest): string | null {
  return req.headers.get('x-device-id');
}
