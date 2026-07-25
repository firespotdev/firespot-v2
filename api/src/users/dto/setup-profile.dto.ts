import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  Matches,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SetupProfileDto {
  @ApiProperty({
    description: "Business/merchant name",
    example: "John Doe Enterprises",
  })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({
    description: "Bank name",
    example: "Access Bank",
  })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({
    description: "Bank code (from Paystack banks list)",
    example: "044",
  })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({
    description: "NUBAN account number (exactly 10 digits)",
    example: "0123456789",
    pattern: "^\\d{10}$",
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: "Account number must be exactly 10 digits" })
  @Matches(/^\d{10}$/, { message: "Account number must contain only digits" })
  accountNumber: string;

  @ApiProperty({
    description: "Referral code (optional)",
    example: "FIRESPOT25",
    required: false,
  })
  @IsOptional()
  @IsString()
  referralCode?: string;
}
