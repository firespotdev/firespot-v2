import { IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PAYSTACK_COLLECTION_CHANNELS } from "../../payments/paystack-collection-channels";

export { PAYSTACK_COLLECTION_CHANNELS };

export class CreatePaystackCollectSaleDto {
  @IsString()
  serialNumber: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAYSTACK_COLLECTION_CHANNELS)
  channel?: string;

  @IsOptional()
  @IsString()
  customerFingerprint?: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}
