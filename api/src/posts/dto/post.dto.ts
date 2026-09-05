import { PartialType } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

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
