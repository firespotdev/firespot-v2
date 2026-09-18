import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
} from "class-validator";
import { PAYSTACK_COLLECTION_CHANNELS } from "../../payments/paystack-collection-channels";

export class UpdatePaymentSettingsDto {
  @IsBoolean()
  @IsOptional()
  savedCardsCheckoutEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  paystackCollectionEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  bankTransferEnabled?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(PAYSTACK_COLLECTION_CHANNELS, { each: true })
  @IsOptional()
  paystackCollectionChannels?: (typeof PAYSTACK_COLLECTION_CHANNELS)[number][];
}
