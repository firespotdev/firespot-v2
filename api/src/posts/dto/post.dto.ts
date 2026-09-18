import { PartialType } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

const POST_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export class PreviewPostDto {
  @IsString()
  @MaxLength(2048)
  sourceUrl: string;
}

export class CreatePostDto extends PreviewPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsMongoId({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsEnum(POST_STATUSES)
  status?: (typeof POST_STATUSES)[number];
}

export class UpdatePostDto extends PartialType(CreatePostDto) {}

export class PostFeedQueryDto {
  @IsOptional()
  @IsIn(["latest", "nearby", "open_now"])
  mode?: "latest" | "nearby" | "open_now" = "latest";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
