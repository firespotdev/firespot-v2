import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsEmail, IsIn, Matches } from "class-validator";

export class UpdateAgentDto {
  @ApiPropertyOptional({
    description: "Agent full name",
    example: "John Doe",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: "Phone number (Nigerian format)",
    example: "08012345678",
  })
  @IsString()
  @IsOptional()
  @Matches(/^0[7-9][0-1]\d{8}$/, {
    message: "Invalid Nigerian phone number format",
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: "Email address",
    example: "john@example.com",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: "Nigerian state",
    example: "Ogun",
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    description: "Local Government Area",
    example: "Abeokuta North",
  })
  @IsString()
  @IsOptional()
  lga?: string;

  @ApiPropertyOptional({
    description: "Bus stop location",
    example: "Obantoko",
  })
  @IsString()
  @IsOptional()
  bustop?: string;

  @ApiPropertyOptional({
    description: "Agent status",
    enum: ["active", "inactive", "suspended"],
  })
  @IsIn(["active", "inactive", "suspended"])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: "Bank code",
    example: "058",
  })
  @IsString()
  @IsOptional()
  bankCode?: string;

  @ApiPropertyOptional({
    description: "Account number",
    example: "0123456789",
  })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional({
    description: "Bank name",
    example: "Guaranty Trust Bank",
  })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({
    description: "Account name",
    example: "JOHN DOE",
  })
  @IsString()
  @IsOptional()
  accountName?: string;
}
