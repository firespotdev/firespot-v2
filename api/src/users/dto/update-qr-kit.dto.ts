import {
  IsBoolean,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateQRKitDto {
  @ApiPropertyOptional({
    description: "Custom name for the QR kit",
    example: "Front Desk QR",
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    description: "Ask eligible customers for feedback after a confirmed sale",
  })
  @IsBoolean()
  @IsOptional()
  collectFeedback?: boolean;
}
