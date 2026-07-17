import { IsNotEmpty, IsMongoId, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreatePendingSaleDto {
  @IsNotEmpty()
  @IsMongoId()
  merchantId: string;

  @IsOptional()
  @IsString()
  customerFingerprint?: string;

  @IsOptional()
  @IsEnum(['New', 'Repeat'])
  customerType?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEnum(['QR scan', 'Link shared', 'Manual'])
  source?: string;
  @IsOptional()
  @IsString()
  targetBankName?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  amount?: number;

  @IsOptional()
  description?: string;

  @IsOptional()
  items?: any[];

  @IsOptional()
  isPaidInFull?: boolean;

  @IsOptional()
  amountPaid?: number;

  @IsOptional()
  totalDue?: number;

  @IsOptional()
  balanceOwed?: number;

  @IsOptional()
  customerId?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}
