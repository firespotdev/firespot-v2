import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { EXPENSE_PAYMENT_METHODS } from "../../schemas/expense.schema";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export const EXPENSE_DESCRIPTION_LIMIT = 140;

export class RecordExpenseDto {
  @ApiProperty({ description: "Full amount of the expense, in naira" })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ maxLength: EXPENSE_DESCRIPTION_LIMIT })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: "Say what this expense was for" })
  @MaxLength(EXPENSE_DESCRIPTION_LIMIT)
  description: string;

  @ApiProperty({ enum: EXPENSE_PAYMENT_METHODS })
  @IsEnum(EXPENSE_PAYMENT_METHODS)
  paymentMethod: (typeof EXPENSE_PAYMENT_METHODS)[number];

  @ApiPropertyOptional({
    description: "Paid now. Leave out for a full payment.",
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional({ description: "When the balance is due (ISO date)" })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  location?: string;
}

export class RecordExpenseRepaymentDto {
  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: EXPENSE_PAYMENT_METHODS })
  @IsEnum(EXPENSE_PAYMENT_METHODS)
  paymentMethod: (typeof EXPENSE_PAYMENT_METHODS)[number];
}

export class ExpensesQueryDto {
  @ApiPropertyOptional({ enum: ["PAID", "OWING"] })
  @IsOptional()
  @IsIn(["PAID", "OWING"])
  status?: "PAID" | "OWING";

  @ApiPropertyOptional({ enum: EXPENSE_PAYMENT_METHODS })
  @IsOptional()
  @IsEnum(EXPENSE_PAYMENT_METHODS)
  paymentMethod?: (typeof EXPENSE_PAYMENT_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === "true" || value === true,
  )
  @IsBoolean()
  includeArchived?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
