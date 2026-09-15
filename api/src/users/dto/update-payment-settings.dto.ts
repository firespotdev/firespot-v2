import { IsBoolean, IsOptional } from "class-validator";

export class UpdatePaymentSettingsDto {
  @IsBoolean()
  @IsOptional()
  savedCardsCheckoutEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  paystackCollectionEnabled?: boolean;
}
