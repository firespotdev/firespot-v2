import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, Min } from 'class-validator';

export class RecordSaleDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(['Bank Transfer', 'Cash', 'POS', 'Other'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  targetBankName?: string;

  @IsOptional()
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
  @IsString()
  customerId?: string;

  @IsOptional()
  items?: any[];

  @IsOptional()
  @IsString()
  dueDate?: string;
}
