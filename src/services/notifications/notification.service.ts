import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SmsService } from "../sms/sms.service";
import { EmailService } from "../email/email.service";
import { AgentDocument } from "../../admin/schemas/agent.schema";

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
    const supportPhone = this.configService.get<string>(
      "SUPPORT_PHONE_NUMBER",
      "+234 XXX XXX XXXX",
    );

    // SMS Message
    const smsMessage = `You're now an active Firespot Agent.

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
      this.logger.error(
        `Failed to send welcome SMS to agent ${agent.agentId}:`,
        error.message,
      );
    }

    // Send Email
    try {
      if (agent.email) {
        const html = this.getWelcomeEmailHtml(
          agent.name,
          agent.agentId,
          agent.referralCode,
          supportPhone,
        );
        await this.emailService.sendEmail(
          agent.email,
          "Welcome to Firespot!",
          html,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to agent ${agent.agentId}:`,
        error.message,
      );
    }
  }

  /**
   * Send suspended notification
   */
  async sendAgentSuspended(agent: AgentDocument): Promise<void> {
    const supportPhone = this.configService.get<string>(
      "SUPPORT_PHONE_NUMBER",
      "+234 XXX XXX XXXX",
    );

    const smsMessage = `Your Firespot Agent account (${agent.agentId}) has been suspended. You can no longer perform any activities as a Firespot Agent. Contact support at ${supportPhone} if you have questions.`;

    try {
      if (agent.phoneNumber) {
        await this.smsService.sendSms(agent.phoneNumber, smsMessage);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send suspension SMS to agent ${agent.agentId}:`,
        error.message,
      );
    }

    try {
      if (agent.email) {
        const html = this.getStatusChangeEmailHtml(
          agent.name,
          agent.agentId,
          "suspended",
          supportPhone,
        );
        await this.emailService.sendEmail(
          agent.email,
          "Account Suspended",
          html,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send suspension email to agent ${agent.agentId}:`,
        error.message,
      );
    }
  }

  /**
   * Send deactivated notification
   */
  async sendAgentDeactivated(agent: AgentDocument): Promise<void> {
    const supportPhone = this.configService.get<string>(
      "SUPPORT_PHONE_NUMBER",
      "+234 XXX XXX XXXX",
    );

    const smsMessage = `Your Firespot Agent account (${agent.agentId}) has been deactivated. Any unactivated QR kits assigned to you have been unassigned. Contact support at ${supportPhone} if you have questions.`;

    try {
      if (agent.phoneNumber) {
        await this.smsService.sendSms(agent.phoneNumber, smsMessage);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send deactivation SMS to agent ${agent.agentId}:`,
        error.message,
      );
    }

    try {
      if (agent.email) {
        const html = this.getStatusChangeEmailHtml(
          agent.name,
          agent.agentId,
          "deactivated",
          supportPhone,
        );
        await this.emailService.sendEmail(
          agent.email,
          "Account Deactivated",
          html,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send deactivation email to agent ${agent.agentId}:`,
        error.message,
      );
    }
  }

  /**
   * Send reactivated notification
   */
  async sendAgentReactivated(agent: AgentDocument): Promise<void> {
    const supportPhone = this.configService.get<string>(
      "SUPPORT_PHONE_NUMBER",
      "+234 XXX XXX XXXX",
    );

    const smsMessage = `Your Firespot Agent account (${agent.agentId}) has been reactivated. You can now resume your activities as a Firespot Agent. Support: ${supportPhone}`;

    try {
      if (agent.phoneNumber) {
        await this.smsService.sendSms(agent.phoneNumber, smsMessage);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send reactivation SMS to agent ${agent.agentId}:`,
        error.message,
      );
    }

    try {
      if (agent.email) {
        const html = this.getStatusChangeEmailHtml(
          agent.name,
          agent.agentId,
          "reactivated",
          supportPhone,
        );
        await this.emailService.sendEmail(
          agent.email,
          "Account Reactivated",
          html,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send reactivation email to agent ${agent.agentId}:`,
        error.message,
      );
    }
  }

  /**
   * Generate welcome email HTML
   */
  private getWelcomeEmailHtml(
    name: string,
    agentId: string,
    referralCode: string,
    supportPhone: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #FB5012 0%, #D72483 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Firespot!</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
    <p>Hello <strong>${name}</strong>,</p>
    <p>You're now an active Firespot Agent! Here are your details:</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Agent ID:</strong> ${agentId}</p>
      <p style="margin: 5px 0;"><strong>Referral Code:</strong> <span style="background: #FB5012; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">${referralCode}</span></p>
    </div>
    <p>Use your referral code when merchants sign up to be linked to you.</p>
    <h3 style="color: #FB5012;">Important Reminders:</h3>
    <ul>
      <li>Do NOT collect activation fees directly</li>
      <li>Payments happen only through Firespot</li>
      <li>Your commissions are credited automatically</li>
    </ul>
    <p style="color: #666; font-size: 14px; margin-top: 30px;">Need help? Contact support at ${supportPhone}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generate status change email HTML
   */
  private getStatusChangeEmailHtml(
    name: string,
    agentId: string,
    status: "suspended" | "deactivated" | "reactivated",
    supportPhone: string,
  ): string {
    const statusColors = {
      suspended: "#f59e0b",
      deactivated: "#ef4444",
      reactivated: "#22c55e",
    };

    const statusMessages = {
      suspended:
        "Your account has been suspended. You can no longer perform any activities as a Firespot Agent.",
      deactivated:
        "Your account has been deactivated. Any unactivated QR kits assigned to you have been unassigned.",
      reactivated:
        "Great news! Your account has been reactivated. You can now resume your activities as a Firespot Agent.",
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${statusColors[status]}; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Account ${status.charAt(0).toUpperCase() + status.slice(1)}</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
    <p>Hello <strong>${name}</strong>,</p>
    <p>${statusMessages[status]}</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Agent ID:</strong> ${agentId}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusColors[status]}; font-weight: bold;">${status.toUpperCase()}</span></p>
    </div>
    <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions, please contact support at ${supportPhone}</p>
  </div>
</body>
</html>`;
  }
}
