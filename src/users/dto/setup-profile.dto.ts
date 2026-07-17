import {
  IsString,
  IsNotEmpty,
  IsIn,
  Length,
  IsOptional,
  Matches,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { BUSINESS_INDUSTRIES } from "../constants/business-industries";

export class SetupProfileDto {
  @ApiProperty({
    description: "Business/merchant name",
    example: "John Doe Enterprises",
  })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({
    description: "Business industry (must be one of GET /users/industries)",
    example: "Food & Drinks",
    enum: BUSINESS_INDUSTRIES,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(BUSINESS_INDUSTRIES, { message: "Invalid industry" })
  industry: string;

  @ApiProperty({
    description: "Short business description",
    example: "Homemade burgers and shakes in Lekki",
    maxLength: 160,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160, {
    message: "Description must be 160 characters or fewer",
  })
  description: string;

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
