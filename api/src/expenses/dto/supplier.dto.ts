import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class SupplierDto {
  @ApiProperty({ maxLength: 80 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: "Enter the supplier's business name" })
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: "08031234567" })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: "Enter the supplier's phone number" })
  @MaxLength(20)
  phoneNumber: string;
}

export class SuppliersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  search?: string;
}
