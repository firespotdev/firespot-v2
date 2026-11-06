import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";

/** Merchant setup can be complete while the account has no personal name. */
@Injectable()
export class PaymentPayerGuard extends JwtAuthGuard {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false | null,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    const payer = super.handleRequest<TUser>(err, user, info, context);
    if (!(payer as { fullName?: string }).fullName?.trim()) {
      throw new ForbiddenException({
        message: "Enter your full name to continue.",
        reason: "personal_identity_required",
      });
    }
    return payer;
  }
}
