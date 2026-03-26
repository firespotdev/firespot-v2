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
  @IsEnum(['QR scan', 'Link shared', 'Manual'])
  source?: string;
  @IsOptional()
  @IsString()
  targetBankName?: string;
}
