import { Resend } from 'resend';

// Initialize Resend client (will be null if API key not set)
let resend: Resend | null = null;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@ayahfinder.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8081';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  /**
   * Send email using Resend
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    // If Resend is not configured, log to console (development mode)
    if (!resend) {
      console.log('📧 Email Service (Development Mode - No Resend API Key)');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('Content:', options.text || options.html);
      console.log('---');
      return;
    }

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`✅ Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      // Don't throw error to prevent blocking user flow
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    const verificationLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - AyahFind</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">AyahFind</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Discover the Quran with AI</p>
          </div>

          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Welcome to AyahFind!</h2>

            <p>Thank you for signing up. To complete your registration, please verify your email address by clicking the button below:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Verify Email Address</a>
            </div>

            <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #667eea; word-break: break-all; font-size: 14px;">${verificationLink}</p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 12px; margin: 0;">This verification link will expire in 24 hours. If you didn't create an account with AyahFind, you can safely ignore this email.</p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} AyahFind. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to AyahFind!

Thank you for signing up. To complete your registration, please verify your email address by visiting this link:

${verificationLink}

This verification link will expire in 24 hours.

If you didn't create an account with AyahFind, you can safely ignore this email.

© ${new Date().getFullYear()} AyahFind. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - AyahFind',
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - AyahFind</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">AyahFind</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Reset Request</p>
          </div>

          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>

            <p>We received a request to reset your password. Click the button below to create a new password:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Reset Password</a>
            </div>

            <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #667eea; word-break: break-all; font-size: 14px;">${resetLink}</p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 12px; margin: 0;">This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} AyahFind. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
Reset Your Password - AyahFind

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

This password reset link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

© ${new Date().getFullYear()} AyahFind. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - AyahFind',
      html,
      text,
    });
  }

  /**
   * Send welcome email (after email verification)
   */
  async sendWelcomeEmail(email: string, displayName?: string): Promise<void> {
    const name = displayName || 'there';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AyahFind!</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to AyahFind!</h1>
          </div>

          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>

            <p>Your email has been verified successfully. You're all set to start discovering the Quran with AI-powered verse recognition.</p>

            <h3 style="color: #667eea; margin-top: 30px;">What you can do:</h3>
            <ul style="line-height: 2;">
              <li>🎤 Record Quran recitations and instantly find the verse</li>
              <li>📖 Browse all 114 Surahs with English translations</li>
              <li>🔍 Search for specific verses</li>
              <li>⭐ Mark your favorite verses (coming soon)</li>
            </ul>

            <h3 style="color: #667eea; margin-top: 30px;">Free Tier Limits:</h3>
            <p style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
              You get <strong>5 verse recognitions per day</strong>. Upgrade to Premium for 100 searches per month!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666;">Start exploring now!</p>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} AyahFind. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to AyahFind!

Hi ${name}!

Your email has been verified successfully. You're all set to start discovering the Quran with AI-powered verse recognition.

What you can do:
- Record Quran recitations and instantly find the verse
- Browse all 114 Surahs with English translations
- Search for specific verses
- Mark your favorite verses (coming soon)

Free Tier Limits:
You get 5 verse recognitions per day. Upgrade to Premium for 100 searches per month!

Start exploring now!

© ${new Date().getFullYear()} AyahFind. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to AyahFind! 🎉',
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
