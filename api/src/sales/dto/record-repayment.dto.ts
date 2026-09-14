import { IsEnum, IsMongoId, IsNumber, IsOptional, Min } from "class-validator";

export class RecordRepaymentDto {
  @IsNumber()
  @Min(0.01)
  amountPaid: number;

  @IsOptional()
  @IsEnum(["Bank Transfer", "Cash", "POS", "Other"])
  paymentMethod?: string;

  @IsOptional()
  @IsMongoId()
  customerId?: string;
}
