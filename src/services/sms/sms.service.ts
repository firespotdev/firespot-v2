import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SmsService {
  constructor(private configService: ConfigService) {}

  /**
   * Send a generic SMS via Termii
   */
  async sendSms(to: string, message: string): Promise<any> {
    const formattedTo = this.formatPhoneNumber(to);
    const mockOtp = this.configService.get<string>('MOCK_OTP', 'false').toLowerCase() === 'true';

    if (mockOtp) {
      console.log('🔧 MOCK MODE: SMS request:', {
        to,
        message,
      });
      return { status: 'mock_success' };
    }

    const termiiApiKey = this.configService.get<string>('TERMII_API_KEY');

    if (!termiiApiKey) {
      console.error('TERMII_API_KEY is not configured');
      throw new InternalServerErrorException('SMS service is not configured.');
    }

    try {
      const payload = {
        api_key: termiiApiKey,
        to: formattedTo,
        from: 'N-Alert',
        sms: message,
        type: 'plain',
        channel: 'dnd',
      };

      const response = await axios.post('https://api.ng.termii.com/api/sms/send', payload);

      console.log('SMS sent successfully via Termii:', {
        to: formattedTo,
        messageId: response.data.message_id,
      });

      return response.data;
    } catch (error) {
      this.handleTermiiError(error, 'SMS');
    }
  }

  /**
   * Send OTP via Termii
   */
  async sendOtp(phoneNumber: string, otpExpiryMinutes: number, otpLength: number, messageTemplate: string): Promise<string> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const mockOtp = this.configService.get<string>('MOCK_OTP', 'false').toLowerCase() === 'true';

    if (mockOtp) {
      const mockPinId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      console.log('🔧 MOCK MODE: OTP request:', {
        phoneNumber: formattedPhone,
        pinId: mockPinId,
        message: messageTemplate,
      });
      return mockPinId;
    }

    const termiiApiKey = this.configService.get<string>('TERMII_API_KEY');

    if (!termiiApiKey) {
      console.error('TERMII_API_KEY is not configured');
      throw new InternalServerErrorException('SMS service is not configured.');
    }

    const pinPlaceholder = `< ${'1'.repeat(otpLength)} >`;
    const message = messageTemplate.replace('{{pin}}', pinPlaceholder);

    try {
      const response = await axios.post('https://api.ng.termii.com/api/sms/otp/send', {
        api_key: termiiApiKey,
        pin_type: 'NUMERIC',
        to: formattedPhone,
        from: 'N-Alert', // Termii requires specific senders for OTP sometimes, keeping consistent with AuthService
        channel: 'dnd',
        pin_attempts: 1,
        pin_time_to_live: otpExpiryMinutes,
        pin_length: otpLength,
        pin_placeholder: pinPlaceholder,
        message_text: message,
      });

      const pinId = response.data.pinId || response.data.pin_id;

      if (!pinId) {
        console.error('Termii did not return a pin_id:', response.data);
        throw new InternalServerErrorException('Failed to generate OTP.');
      }

      console.log('OTP sent successfully via Termii:', {
        phoneNumber: formattedPhone,
        pinId,
      });

      return pinId;
    } catch (error) {
      this.handleTermiiError(error, 'OTP');
    }
  }

  /**
   * Verify OTP via Termii
   */
  async verifyOtp(pinId: string, pin: string): Promise<boolean> {
    const mockOtp = this.configService.get<string>('MOCK_OTP', 'false').toLowerCase() === 'true';

    if (mockOtp) {
      const isValid = /^\d+$/.test(pin);
      return isValid;
    }

    const termiiApiKey = this.configService.get<string>('TERMII_API_KEY');

    if (!termiiApiKey) {
      console.error('TERMII_API_KEY is not configured');
      throw new InternalServerErrorException('SMS service is not configured.');
    }

    try {
      const response = await axios.post('https://api.ng.termii.com/api/sms/otp/verify', {
        api_key: termiiApiKey,
        pin_id: pinId,
        pin: pin,
      });

      const isVerified = response.data.verified === 'True' || response.data.verified === true;
      return isVerified;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        return false;
      }
      this.handleTermiiError(error, 'OTP verification');
    }
  }

  /**
   * Formats a phone number for Termii (international format without +)
   * Example: 08065622894 -> 2348065622894
   * Example: +2348065622894 -> 2348065622894
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If it starts with 0 and is 11 digits, assume local Nigerian and convert
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '234' + cleaned.substring(1);
    }

    return cleaned;
  }

  private handleTermiiError(error: any, context: string): never {
    if (axios.isAxiosError(error)) {
      console.error(`Termii ${context} error:`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      if (error.response?.status === 401) {
        throw new InternalServerErrorException('SMS service authentication failed.');
      }

      if (error.response?.status === 400) {
        throw new BadRequestException('Invalid request format for SMS service.');
      }

      throw new InternalServerErrorException(`Failed to process ${context}.`);
    }

    throw error;
  }
}
