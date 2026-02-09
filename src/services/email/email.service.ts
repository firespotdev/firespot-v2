import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    if (!apiKey) {
      this.logger.warn(
        "RESEND_API_KEY is not configured. Email service will not work.",
      );
    }
    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>(
      "RESEND_FROM_EMAIL",
      "Firespot <noreply@firespot.co>",
    );
  }

  /**
   * Send an email via Resend
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    variables?: Record<string, any>,
  ): Promise<any> {
    const mockOtp =
      this.configService.get<string>("MOCK_OTP", "false").toLowerCase() ===
      "true";

    if (mockOtp) {
      this.logger.log("🔧 MOCK MODE: Email request:", {
        to,
        subject,
        html: html.substring(0, 100) + "...",
        variables,
      });
      return { id: "mock_id", status: "mock_success" };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject: subject,
        html: html,
      });

      if (error) {
        this.logger.error("Resend email error:", error);
        throw new InternalServerErrorException("Failed to send email.");
      }

      this.logger.log("Email sent successfully via Resend:", {
        to,
        subject,
        messageId: data?.id,
      });

      return data;
    } catch (error) {
      this.handleResendError(error, "Email");
    }
  }

  /**
   * Send a plain text email via Resend
   */
  async sendTextEmail(to: string, subject: string, text: string): Promise<any> {
    const mockOtp =
      this.configService.get<string>("MOCK_OTP", "false").toLowerCase() ===
      "true";

    if (mockOtp) {
      this.logger.log("🔧 MOCK MODE: Text email request:", {
        to,
        subject,
        text: text.substring(0, 100),
      });
      return { id: "mock_id", status: "mock_success" };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject: subject,
        text: text,
      });

      if (error) {
        this.logger.error("Resend email error:", error);
        throw new InternalServerErrorException("Failed to send email.");
      }

      this.logger.log("Text email sent successfully via Resend");

      return data;
    } catch (error) {
      this.handleResendError(error, "Text Email");
    }
  }

  private handleResendError(error: any, context: string): never {
    this.logger.error(`Resend ${context} error:`, {
      message: error.message,
      name: error.name,
    });

    throw new InternalServerErrorException(
      `Failed to send ${context.toLowerCase()}.`,
    );
  }
}
