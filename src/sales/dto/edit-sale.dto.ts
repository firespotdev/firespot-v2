import { IsNumber, IsOptional, IsString, IsEnum, Min } from 'class-validator'

export class EditSaleDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(['Bank Transfer', 'Cash', 'POS', 'Other'])
  paymentMethod?: string
}
