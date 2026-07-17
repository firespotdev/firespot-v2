import { IsString, IsNotEmpty, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateProfileDto {
  @ApiProperty({
    description: "User's first name",
    example: "David",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: "First name is required" })
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: "User's last name",
    example: "Areegbe",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: "Last name is required" })
  @MaxLength(50)
  lastName: string;
}
