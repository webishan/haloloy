// Initialize Twilio only if available
let twilio: any = null;
try {
  twilio = require('twilio');
} catch (error) {
  console.log('📱 Twilio not available, using console fallback');
}

export interface SMSMessage {
  to: string;
  body: string;
}

export class SMSService {
  private static instance: SMSService;
  private client: any = null;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && twilio);
    
    if (this.isEnabled) {
      this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      console.log('📱 SMS service enabled with Twilio');
    } else {
      console.log('📱 SMS service disabled - TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not found');
    }
  }

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  async sendPasswordResetCode(phoneNumber: string, code: string): Promise<boolean> {
    if (!this.isEnabled) {
      console.log(`📱 [DEV] SMS password reset code for ${phoneNumber}: ${code}`);
      return true;
    }

    try {
      const message = await this.client!.messages.create({
        body: `Your Holyloy Global Admin password reset code is: ${code}. This code expires in 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`📱 Password reset SMS sent to ${phoneNumber} - SID: ${message.sid}`);
      return true;
    } catch (error) {
      console.error('📱 SMS sending failed:', error);
      return false;
    }
  }

  async sendPasswordResetSuccess(phoneNumber: string): Promise<boolean> {
    if (!this.isEnabled) {
      console.log(`📱 [DEV] Password reset successful SMS for ${phoneNumber}`);
      return true;
    }

    try {
      const message = await this.client!.messages.create({
        body: 'Your Holyloy Global Admin password has been successfully reset. If you did not make this change, please contact your administrator immediately.',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`📱 Password reset success SMS sent to ${phoneNumber} - SID: ${message.sid}`);
      return true;
    } catch (error) {
      console.error('📱 SMS sending failed:', error);
      return false;
    }
  }

  // Utility method to format phone numbers
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 1, assume it's US number and remove the 1
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1${cleaned.substring(1)}`;
    }
    
    // If it's 10 digits, assume US number
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    
    // Otherwise, add + if not present
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  // Validate phone number format
  isValidPhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    // Basic validation - should be at least 10 digits and start with +
    return /^\+\d{10,15}$/.test(formatted);
  }
}

export default SMSService;
