import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsService } from '../sms/sms.service';
import { EmailService } from '../email/email.service';
import { AgentDocument } from '../../admin/schemas/agent.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private configService: ConfigService,
    private smsService: SmsService,
    private emailService: EmailService,
  ) {}

  /**
   * Send welcome notification to a new agent
   */
  async sendAgentWelcome(agent: AgentDocument): Promise<void> {
    const supportPhone = this.configService.get<string>('SUPPORT_PHONE_NUMBER', '+234 XXX XXX XXXX');
    
    // SMS Message
    const smsMessage = `You’re now an active Firespot Agent.

Agent ID: ${agent.agentId}
Referral code: ${agent.referralCode}

Use this code when merchants sign up to be linked to you.

Merchants activate by scanning a Firespot QR kit.

Important:
• Do NOT collect activation fees
• Payments happen only on Firespot
• Commissions are credited automatically

Agent support: ${supportPhone}
— Firespot`;

    // Send SMS
    try {
      if (agent.phoneNumber) {
        await this.smsService.sendSms(agent.phoneNumber, smsMessage);
      }
    } catch (error) {
      this.logger.error(`Failed to send welcome SMS to agent ${agent.agentId}:`, error.message);
    }

    // Send Email
    try {
      if (agent.email) {
        const templateId = this.configService.get<string>('TERMII_AGENT_WELCOME_TEMPLATE_ID');
        await this.emailService.sendEmail(
          agent.email,
          'Welcome to Firespot!',
          templateId,
          {
            name: agent.name,
            agent_id: agent.agentId,
            referral_code: agent.referralCode,
            support_phone: supportPhone,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send welcome email to agent ${agent.agentId}:`, error.message);
    }
  }

  /**
   * Send suspended notification
   */
  async sendAgentSuspended(agent: AgentDocument): Promise<void> {
    const supportPhone = this.configService.get<string>('SUPPORT_PHONE_NUMBER', '+234 XXX XXX XXXX');
    
    const smsMessage = `Your Firespot Agent account (${agent.agentId}) has been suspended. You can no longer perform any activities as a Firespot Agent. Contact support at ${supportPhone} if you have questions.`;

    try {
      if (agent.phoneNumber) {
        await this.smsService.sendSms(agent.phoneNumber, smsMessage);
      }
    } catch (error) {
      this.logger.error(`Failed to send suspension SMS to agent ${agent.agentId}:`, error.message);
    }

    try {
      if (agent.email) {
        const templateId = this.configService.get<string>('TERMII_AGENT_SUSPENDED_TEMPLATE_ID');
        await this.emailService.sendEmail(
          agent.email,
          'Account Suspended',
          templateId,
          {
            name: agent.name,
            agent_id: agent.agentId,
            support_phone: supportPhone,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send suspension email to agent ${agent.agentId}:`, error.message);
    }
  }

  /**
   * Send deactivated notification
   */
  async sendAgentDeactivated(agent: AgentDocument): Promise<void> {
    const supportPhone = this.configService.get<string>('SUPPORT_PHONE_NUMBER', '+234 XXX XXX XXXX');
    
    const smsMessage = `Your Firespot Agent account (${agent.agentId}) has been deactivated. Any unactivated QR kits assigned to you have been unassigned. Contact support at ${supportPhone} if you have questions.`;

    try {
      if (agent.phoneNumber) {
        await this.smsService.sendSms(agent.phoneNumber, smsMessage);
      }
    } catch (error) {
      this.logger.error(`Failed to send deactivation SMS to agent ${agent.agentId}:`, error.message);
    }

    try {
      if (agent.email) {
        const templateId = this.configService.get<string>('TERMII_AGENT_DEACTIVATED_TEMPLATE_ID');
        await this.emailService.sendEmail(
          agent.email,
          'Account Deactivated',
          templateId,
          {
            name: agent.name,
            agent_id: agent.agentId,
            support_phone: supportPhone,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send deactivation email to agent ${agent.agentId}:`, error.message);
    }
  }

  /**
   * Send reactivated notification
   */
  async sendAgentReactivated(agent: AgentDocument): Promise<void> {
    const supportPhone = this.configService.get<string>('SUPPORT_PHONE_NUMBER', '+234 XXX XXX XXXX');
    
    // Reuse welcome message or similar for reactivation
    const smsMessage = `Your Firespot Agent account (${agent.agentId}) has been reactivated. You can now resume your activities as a Firespot Agent. Support: ${supportPhone}`;

    try {
      if (agent.phoneNumber) {
        await this.smsService.sendSms(agent.phoneNumber, smsMessage);
      }
    } catch (error) {
      this.logger.error(`Failed to send reactivation SMS to agent ${agent.agentId}:`, error.message);
    }

    try {
      if (agent.email) {
        const templateId = this.configService.get<string>('TERMII_AGENT_REACTIVATED_TEMPLATE_ID');
        await this.emailService.sendEmail(
          agent.email,
          'Account Reactivated',
          templateId,
          {
            name: agent.name,
            agent_id: agent.agentId,
            support_phone: supportPhone,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send reactivation email to agent ${agent.agentId}:`, error.message);
    }
  }
}
