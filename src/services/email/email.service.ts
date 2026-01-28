import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Send a templated email via Termii
   */
  async sendEmail(
    to: string,
    subject: string,
    templateId: string,
    variables: Record<string, any>,
  ): Promise<any> {
    const mockOtp = this.configService.get<string>('MOCK_OTP', 'false').toLowerCase() === 'true';

    if (mockOtp) {
      this.logger.log('🔧 MOCK MODE: Email request:', {
        to,
        subject,
        templateId,
        variables,
      });
      return { status: 'mock_success' };
    }

    const termiiApiKey = this.configService.get<string>('TERMII_API_KEY');
    const emailConfigId = this.configService.get<string>('TERMII_EMAIL_CONFIG_ID');

    if (!termiiApiKey || !emailConfigId) {
      this.logger.error('TERMII_API_KEY or TERMII_EMAIL_CONFIG_ID is not configured');
      throw new InternalServerErrorException('Email service is not configured.');
    }

    if (!templateId) {
      this.logger.warn(`Template ID is missing for email to ${to} with subject "${subject}"`);
      return; // Or handle as needed
    }

    try {
      const response = await axios.post('https://api.ng.termii.com/api/templates/send-email', {
        api_key: termiiApiKey,
        email: to,
        subject: subject,
        email_configuration_id: emailConfigId,
        template_id: templateId,
        variables: variables,
      });

      this.logger.log('Email sent successfully via Termii:', {
        to,
        subject,
        messageId: response.data.message_id,
      });

      return response.data;
    } catch (error) {
      this.handleTermiiError(error, 'Email');
    }
  }

  private handleTermiiError(error: any, context: string): never {
    if (axios.isAxiosError(error)) {
      this.logger.error(`Termii ${context} error:`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      if (error.response?.status === 401) {
        throw new InternalServerErrorException(`${context} service authentication failed.`);
      }

      throw new InternalServerErrorException(`Failed to process ${context}.`);
    }

    throw error;
  }
}
