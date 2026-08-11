import { IsIn, IsOptional, IsString } from "class-validator";
import { PAYSTACK_COLLECTION_CHANNELS } from "./create-paystack-collect-sale.dto";

export class InitializePaystackSaleDto {
  @IsString()
  serialNumber: string;

  @IsOptional()
  @IsString()
  @IsIn(PAYSTACK_COLLECTION_CHANNELS)
  channel?: string;

  @IsOptional()
  @IsString()
  customerFingerprint?: string;
}

export class ReconcilePaystackSaleDto {
  @IsString()
  serialNumber: string;

  @IsOptional()
  @IsString()
  customerFingerprint?: string;
}
