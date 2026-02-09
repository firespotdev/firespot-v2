import { IsString, IsNotEmpty, Length, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyOtpDto {
  @ApiProperty({
    description: "Phone number without country code (10-11 digits)",
    example: "8179542786",
    pattern: "^[0-9]{10,11}$",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10,11}$/, {
    message: "Phone number must be 10 or 11 digits",
  })
  phoneNumber: string;

  @ApiProperty({
    description: "OTP code received via SMS (4-8 digits)",
    example: "123456",
    minLength: 4,
    maxLength: 8,
    pattern: "^[0-9]{4,8}$",
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 8, { message: "OTP must be between 4 and 8 digits" })
  @Matches(/^[0-9]{4,8}$/, { message: "OTP must be numeric" })
  otpCode: string;
}
