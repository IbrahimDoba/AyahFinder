import { db } from "@/lib/db/client";
import {
  hashPassword,
  verifyPassword,
  generateVerificationToken,
  generatePasswordResetToken,
  validatePasswordStrength,
} from "@/lib/utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "@/lib/utils/jwt";
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
} from "@/lib/utils/errors";
import { TOKEN_EXPIRY } from "@/lib/config/constants";
import type { User } from "@prisma/client";

export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    subscriptionTier: string;
    emailVerified: boolean;
    createdAt: Date;
  };
}

class AuthService {
  /**
   * Register a new user
   */
  async register(
    data: RegisterData,
  ): Promise<{ userId: string; verificationToken: string }> {
    const { email, password, displayName } = data;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError("Invalid email format");
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        "Password does not meet requirements",
        passwordValidation.errors,
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ValidationError("User with this email already exists");
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(
      Date.now() + TOKEN_EXPIRY.VERIFICATION,
    );

    // Create user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        displayName: displayName || null,
        verificationToken,
        verificationTokenExpiry,
        emailVerified: true, // Auto-verify for development
      },
    });

    return {
      userId: user.id,
      verificationToken,
    };
  }

  /**
   * Login user with email and password
   */
  async login(data: LoginData): Promise<AuthResult> {
    const { email, password } = data;

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Check if email is verified
    if (!user.emailVerified) {
      // Auto-verify for development
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      user.emailVerified = true;
    }

    // Generate tokens
    const token = generateAccessToken({
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    });

    // Update last login and store refresh token
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        refreshToken,
      },
    });

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        subscriptionTier: user.subscriptionTier,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    // Find user with verification token
    const user = await db.user.findFirst({
      where: {
        verificationToken: token,
      },
    });

    if (!user) {
      throw new NotFoundError("Invalid or expired verification token");
    }

    // Check if token is expired
    if (
      user.verificationTokenExpiry &&
      user.verificationTokenExpiry < new Date()
    ) {
      throw new ValidationError("Verification token has expired");
    }

    // Update user as verified
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string> {
    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists for security
    if (!user) {
      // Return a token anyway to prevent email enumeration
      return generatePasswordResetToken();
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken();
    const resetExpiry = new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET);

    // Store reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      },
    });

    return resetToken;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        "Password does not meet requirements",
        passwordValidation.errors,
      );
    }

    // Find user with reset token
    const user = await db.user.findFirst({
      where: {
        passwordResetToken: token,
      },
    });

    if (!user) {
      throw new NotFoundError("Invalid or expired reset token");
    }

    // Check if token is expired
    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      throw new ValidationError("Reset token has expired");
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        refreshToken: null, // Invalidate existing sessions
      },
    });
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken);

      if (decoded.type !== "refresh") {
        throw new AuthenticationError("Invalid token type");
      }

      // Find user and verify refresh token matches
      const user = await db.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new AuthenticationError("Invalid refresh token");
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
      });

      const newRefreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
      });

      // Store new refresh token
      await db.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
      });

      return {
        token: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new AuthenticationError("Failed to refresh token");
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<string> {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.emailVerified) {
      throw new ValidationError("Email is already verified");
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(
      Date.now() + TOKEN_EXPIRY.VERIFICATION,
    );

    await db.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry,
      },
    });

    return verificationToken;
  }
}

export const authService = new AuthService();
