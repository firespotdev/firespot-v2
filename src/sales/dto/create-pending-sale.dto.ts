import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreatePendingSaleDto {
  @IsNotEmpty()
  @IsMongoId()
  merchantId: string;

  @IsOptional()
  @IsString()
  customerFingerprint?: string;

  @IsOptional()
  @IsEnum(["New", "Repeat"])
  customerType?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEnum(["QR scan", "Link shared", "Manual"])
  source?: string;
  @IsOptional()
  @IsString()
  targetBankName?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  items?: any[];

  @IsOptional()
  @IsMongoId()
  customerId?: string;
}
