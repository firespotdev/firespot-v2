import { IsBoolean } from "class-validator";

export class UpdatePaymentSettingsDto {
  @IsBoolean()
  savedCardsCheckoutEnabled: boolean;
}
