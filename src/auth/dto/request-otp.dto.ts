import { IsString, IsNotEmpty, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RequestOtpDto {
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
    description: "Country code with + prefix",
    example: "+234",
    default: "+234",
  })
  @IsString()
  @IsNotEmpty()
  phoneCountryCode: string; // e.g., "+234"
}
