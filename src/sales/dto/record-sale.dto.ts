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
}
