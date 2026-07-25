import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RecordCopyDto {
  @ApiProperty({
    required: false,
    description: "The account number that was copied",
    example: "0123456789",
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({
    required: false,
    description: "The bank name of the copied account",
    example: "Access Bank",
  })
  @IsOptional()
  @IsString()
  bankName?: string;
}
