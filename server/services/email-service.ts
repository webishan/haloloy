import sgMail from '@sendgrid/mail';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static instance: EmailService;
  private isEnabled: boolean;

  constructor() {
    // Initialize SendGrid only if available
    console.log('📧 EmailService constructor called');
    console.log('📧 SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
    console.log('📧 SENDGRID_API_KEY length:', process.env.SENDGRID_API_KEY?.length);
    
    try {
      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.isEnabled = true;
        console.log('📧 SendGrid initialized successfully');
      } else {
        this.isEnabled = false;
        console.log('📧 Email service disabled - SENDGRID_API_KEY not found');
      }
    } catch (error) {
      this.isEnabled = false;
      console.log('📧 SendGrid not available, using console fallback');
      console.log('📧 Error:', error.message);
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendPasswordResetCode(email: string, code: string, name?: string): Promise<boolean> {
    if (!this.isEnabled) {
      console.log(`📧 [DEV] Password reset code for ${email}: ${code}`);
      return true;
    }

    try {
      const msg = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@holyloy.com',
          name: 'Holyloy Global Admin'
        },
        subject: 'Password Reset Code - Holyloy Global Admin',
        html: this.getPasswordResetHtml(code, name),
        text: this.getPasswordResetText(code, name)
      };

      await sgMail.send(msg);
      console.log(`📧 Password reset code sent to ${email}`);
      return true;
    } catch (error) {
      console.error('📧 Email sending failed:', error);
      return false;
    }
  }

  async sendPasswordResetSuccess(email: string, name?: string): Promise<boolean> {
    if (!this.isEnabled) {
      console.log(`📧 [DEV] Password reset successful for ${email}`);
      return true;
    }

    try {
      const msg = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@holyloy.com',
          name: 'Holyloy Global Admin'
        },
        subject: 'Password Reset Successful - Holyloy Global Admin',
        html: this.getPasswordResetSuccessHtml(name),
        text: this.getPasswordResetSuccessText(name)
      };

      await sgMail.send(msg);
      console.log(`📧 Password reset success notification sent to ${email}`);
      return true;
    } catch (error) {
      console.error('📧 Email sending failed:', error);
      return false;
    }
  }

  private getPasswordResetHtml(code: string, name?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Holyloy Global Admin</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: #1f2937; color: #f9fafb; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; font-size: 24px; font-weight: bold; letter-spacing: 3px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
            <p>Holyloy Global Admin Portal</p>
          </div>
          <div class="content">
            <h2>Hello ${name || 'Admin'},</h2>
            <p>You have requested to reset your password for the Holyloy Global Admin Portal.</p>
            
            <div class="code-box">
              ${code}
            </div>
            
            <p>Please use this verification code to complete your password reset. This code will expire in <strong>10 minutes</strong>.</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and contact your system administrator immediately.
            </div>
            
            <p>For security reasons, this code can only be used once and will expire automatically.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Holyloy Global Admin Portal</p>
            <p>© 2024 Holyloy. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetText(code: string, name?: string): string {
    return `
Password Reset Request - Holyloy Global Admin Portal

Hello ${name || 'Admin'},

You have requested to reset your password for the Holyloy Global Admin Portal.

Your verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this password reset, please ignore this email and contact your system administrator immediately.

For security reasons, this code can only be used once and will expire automatically.

---
This is an automated message from Holyloy Global Admin Portal
© 2024 Holyloy. All rights reserved.
    `;
  }

  private getPasswordResetSuccessHtml(name?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful - Holyloy Global Admin</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d1fae5; border: 1px solid #10b981; color: #065f46; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Reset Successful</h1>
            <p>Holyloy Global Admin Portal</p>
          </div>
          <div class="content">
            <h2>Hello ${name || 'Admin'},</h2>
            
            <div class="success-box">
              <h3>🎉 Your password has been successfully reset!</h3>
              <p>You can now log in to the Global Admin Portal with your new password.</p>
            </div>
            
            <p>If you didn't make this change, please contact your system administrator immediately as your account may have been compromised.</p>
            
            <p>For security reasons, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Enabling two-factor authentication if available</li>
              <li>Regularly updating your password</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated message from Holyloy Global Admin Portal</p>
            <p>© 2024 Holyloy. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetSuccessText(name?: string): string {
    return `
Password Reset Successful - Holyloy Global Admin Portal

Hello ${name || 'Admin'},

Your password has been successfully reset!

You can now log in to the Global Admin Portal with your new password.

If you didn't make this change, please contact your system administrator immediately as your account may have been compromised.

For security reasons, we recommend:
- Using a strong, unique password
- Enabling two-factor authentication if available
- Regularly updating your password

---
This is an automated message from Holyloy Global Admin Portal
© 2024 Holyloy. All rights reserved.
    `;
  }
}

export default EmailService;
