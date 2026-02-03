// =============================================================================
// GovBid Pro - Email Configuration
// =============================================================================
// Email service configuration for SMTP and SendGrid
// =============================================================================

import nodemailer, { Transporter } from 'nodemailer';

// =============================================================================
// EMAIL CONFIGURATION INTERFACES
// =============================================================================

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid';
  smtp: SMTPConfig;
  sendgrid: SendGridConfig;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  verificationUrl: string;
  passwordResetUrl: string;
  appUrl: string;
}

// =============================================================================
// CONFIGURATION VALUES
// =============================================================================

export const smtpConfig: SMTPConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
};

export const sendgridConfig: SendGridConfig = {
  apiKey: process.env.SENDGRID_API_KEY || '',
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@govbidpro.com',
  fromName: process.env.SENDGRID_FROM_NAME || 'GovBid Pro',
};

export const emailConfig: EmailConfig = {
  provider: (process.env.EMAIL_PROVIDER as 'smtp' | 'sendgrid') || 'smtp',
  smtp: smtpConfig,
  sendgrid: sendgridConfig,
  fromEmail: process.env.EMAIL_FROM || sendgridConfig.fromEmail || smtpConfig.user,
  fromName: process.env.EMAIL_FROM_NAME || 'GovBid Pro',
  replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || smtpConfig.user,
  verificationUrl: process.env.EMAIL_VERIFICATION_URL || 'http://localhost:5173/verify-email',
  passwordResetUrl: process.env.PASSWORD_RESET_URL || 'http://localhost:5173/reset-password',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
};

// =============================================================================
// EMAIL TRANSPORTER
// =============================================================================

let transporter: Transporter | null = null;

/**
 * Get email transporter (lazy initialization)
 */
export function getTransporter(): Transporter {
  if (!transporter) {
    if (emailConfig.provider === 'sendgrid') {
      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: sendgridConfig.apiKey,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.password,
        },
      });
    }
  }

  return transporter;
}

// =============================================================================
// EMAIL TYPES
// =============================================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// EMAIL SENDING
// =============================================================================

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const transport = getTransporter();

    const mailOptions = {
      from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      replyTo: options.replyTo || emailConfig.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    };

    const result = await transport.sendMail(mailOptions);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export const emailTemplates = {
  /**
   * Email verification template
   */
  verification: (params: { name: string; token: string }): EmailOptions => ({
    to: '',
    subject: 'Verify Your GovBid Pro Email',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">GovBid Pro</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1e3a5f;">Welcome, ${params.name}!</h2>
          <p>Thank you for signing up for GovBid Pro. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.verificationUrl}?token=${params.token}"
               style="background: #2c5282; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} GovBid Pro. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Password reset template
   */
  passwordReset: (params: { name: string; token: string }): EmailOptions => ({
    to: '',
    subject: 'Reset Your GovBid Pro Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">GovBid Pro</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1e3a5f;">Password Reset Request</h2>
          <p>Hi ${params.name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.passwordResetUrl}?token=${params.token}"
               style="background: #2c5282; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} GovBid Pro. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Contract match notification template
   */
  contractMatch: (params: {
    name: string;
    contractTitle: string;
    contractId: string;
    matchScore: number;
    deadline: string;
  }): EmailOptions => ({
    to: '',
    subject: `New Contract Match: ${params.contractTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contract Match</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">GovBid Pro</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1e3a5f;">New Contract Match Found!</h2>
          <p>Hi ${params.name},</p>
          <p>We found a new contract opportunity that matches your profile:</p>
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e3a5f; margin-top: 0;">${params.contractTitle}</h3>
            <p style="margin: 10px 0;">
              <strong>Match Score:</strong>
              <span style="color: #2c5282; font-weight: bold;">${params.matchScore}%</span>
            </p>
            <p style="margin: 10px 0;">
              <strong>Deadline:</strong> ${params.deadline}
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.appUrl}/contracts/${params.contractId}"
               style="background: #2c5282; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Contract Details
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} GovBid Pro. All rights reserved.<br>
            <a href="${emailConfig.appUrl}/settings/notifications" style="color: #999;">Manage notification preferences</a>
          </p>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Deadline reminder template
   */
  deadlineReminder: (params: {
    name: string;
    contractTitle: string;
    contractId: string;
    deadline: string;
    daysRemaining: number;
  }): EmailOptions => ({
    to: '',
    subject: `Deadline Reminder: ${params.daysRemaining} day${params.daysRemaining > 1 ? 's' : ''} left - ${params.contractTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deadline Reminder</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #c53030 0%, #e53e3e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">⏰ Deadline Reminder</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
          <p>Hi ${params.name},</p>
          <p>This is a reminder that a contract deadline is approaching:</p>
          <div style="background: #fff5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c53030;">
            <h3 style="color: #c53030; margin-top: 0;">${params.contractTitle}</h3>
            <p style="margin: 10px 0; font-size: 18px;">
              <strong>Deadline:</strong> ${params.deadline}
            </p>
            <p style="margin: 10px 0; font-size: 24px; color: #c53030; font-weight: bold;">
              ${params.daysRemaining} day${params.daysRemaining > 1 ? 's' : ''} remaining
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.appUrl}/contracts/${params.contractId}"
               style="background: #c53030; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Contract
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} GovBid Pro. All rights reserved.<br>
            <a href="${emailConfig.appUrl}/settings/notifications" style="color: #999;">Manage notification preferences</a>
          </p>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Team invitation template
   */
  teamInvitation: (params: {
    inviterName: string;
    organizationName: string;
    token: string;
    role: string;
  }): EmailOptions => ({
    to: '',
    subject: `You've been invited to join ${params.organizationName} on GovBid Pro`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">GovBid Pro</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1e3a5f;">You're Invited!</h2>
          <p>${params.inviterName} has invited you to join <strong>${params.organizationName}</strong> on GovBid Pro as a <strong>${params.role}</strong>.</p>
          <p>GovBid Pro helps teams discover, track, and bid on government contracts with AI-powered assistance.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.appUrl}/invite/${params.token}"
               style="background: #2c5282; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} GovBid Pro. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `,
  }),
};

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate email configuration
 */
export function validateEmailConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (emailConfig.provider === 'smtp') {
    if (!smtpConfig.host) errors.push('SMTP_HOST is required');
    if (!smtpConfig.user) errors.push('SMTP_USER is required');
    if (!smtpConfig.password) errors.push('SMTP_PASSWORD is required');
  } else if (emailConfig.provider === 'sendgrid') {
    if (!sendgridConfig.apiKey) errors.push('SENDGRID_API_KEY is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Test email configuration by sending a test email
 */
export async function testEmailConfig(testEmail: string): Promise<EmailResult> {
  return sendEmail({
    to: testEmail,
    subject: 'GovBid Pro - Email Configuration Test',
    html: `
      <h1>Email Configuration Test</h1>
      <p>If you received this email, your email configuration is working correctly!</p>
      <p>Sent at: ${new Date().toISOString()}</p>
    `,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  config: emailConfig,
  smtp: smtpConfig,
  sendgrid: sendgridConfig,
  getTransporter,
  send: sendEmail,
  templates: emailTemplates,
  validateConfig: validateEmailConfig,
  testConfig: testEmailConfig,
};
