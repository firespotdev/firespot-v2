import { IsString, IsNotEmpty, Length, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateMerchantSlugDto {
  @ApiProperty({
    description: "Merchant slug (exactly 6 alphanumeric characters)",
    example: "ABC123",
    pattern: "^[A-Z0-9]{6}$",
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: "Merchant slug must be exactly 6 characters" })
  @Matches(/^[A-Z0-9]{6}$/i, {
    message: "Merchant slug must contain only alphanumeric characters",
  })
  merchantSlug: string;
}
