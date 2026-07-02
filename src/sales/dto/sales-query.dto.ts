import { IsOptional, IsEnum, IsString, IsNumberString } from 'class-validator';

export class SalesQueryDto {
  @IsOptional()
  @IsEnum(['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string; // ISO date string

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  preset?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  mode?: 'collected' | 'recorded';

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  qrKitName?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

