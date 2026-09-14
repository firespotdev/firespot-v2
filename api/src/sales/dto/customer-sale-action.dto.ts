import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CustomerSaleActionDto {
  @IsNotEmpty()
  @IsString()
  serialNumber: string;

  @IsOptional()
  @IsString()
  targetBankName?: string;

  @IsOptional()
  @IsString()
  targetAccountNumber?: string;

  @IsOptional()
  @IsString()
  sourceBankName?: string;
}
