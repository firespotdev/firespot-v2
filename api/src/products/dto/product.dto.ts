import { plainToInstance, Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { PartialType } from "@nestjs/swagger";

export class OptionValueDto {
  @IsString()
  @MaxLength(80)
  id: string;

  @IsString()
  @MaxLength(80)
  value: string;
}

export class ProductOptionDto {
  @IsString()
  @MaxLength(80)
  id: string;

  @IsString()
  @MaxLength(80)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OptionValueDto)
  values: OptionValueDto[];
}

export class VariantPriceOverrideDto {
  @IsString()
  combinationKey: string;

  @IsArray()
  @IsString({ each: true })
  optionValueIds: string[];

  @IsNumber()
  @Min(0)
  price: number;
}

const parseMultipartArray = <T>(value: unknown, dto: new () => T): unknown => {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? plainToInstance(dto, parsed) : parsed;
};

export class CreateProductDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsMongoId()
  categoryId: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @Transform(({ value }) => parseMultipartArray(value, ProductOptionDto))
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  options?: ProductOptionDto[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => parseMultipartArray(value, VariantPriceOverrideDto))
  @ValidateNested({ each: true })
  @Type(() => VariantPriceOverrideDto)
  variantPriceOverrides?: VariantPriceOverrideDto[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    typeof value === "string" ? JSON.parse(value) : value,
  )
  @IsString({ each: true })
  excludedVariantKeys?: string[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class CreateCategoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  names: string[];
}

export class UpdateCategoryDto {
  @IsString()
  @MaxLength(100)
  name: string;
}

export class RestoreProductDto {
  @IsMongoId()
  categoryId: string;
}
