import {
  IsArray,
  IsBoolean,
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
  @IsMongoId()
  customerUserId?: string;

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
  @IsBoolean()
  isPaidInFull?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  totalDue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  balanceOwed?: number;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}
