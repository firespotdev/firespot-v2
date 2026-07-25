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

export class RecordSaleDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsEnum(["Bank Transfer", "Cash", "POS", "Other"])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  targetBankName?: string;

  @IsOptional()
  @IsBoolean()
  isPaidInFull?: boolean;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsNumber()
  totalDue?: number;

  @IsOptional()
  @IsNumber()
  balanceOwed?: number;

  @IsOptional()
  @IsMongoId()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsArray()
  items?: any[];

  @IsOptional()
  @IsString()
  dueDate?: string;
}
