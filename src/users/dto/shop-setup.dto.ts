import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * All shop-setup fields are optional and independently editable — a merchant
 * fills them in over several sessions, and the checklist counts whichever are
 * present. URLs are stored as plain strings (merchants paste handles, not
 * canonical URLs), so they are not @IsUrl-validated.
 */

class SocialLinksDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instagram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  facebook?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tiktok?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  x?: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: "Enter a valid email address" })
  businessEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({ type: SocialLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}

export class UpdateFulfillmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  walkIn?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reservations?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  homeService?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  delivery?: boolean;
}

export class UpdateLocationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  insideMarket?: boolean;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  branchCount?: number;
}
