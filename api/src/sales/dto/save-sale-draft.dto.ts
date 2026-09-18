import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class SaveSaleDraftItemDto {
  @IsString()
  @MaxLength(160)
  clientId: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  productId?: string;

  @IsString()
  @MaxLength(240)
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(999)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @IsOptional()
  @IsObject()
  selectedVariant?: Record<string, unknown>;
}

export class SaveSaleDraftDto {
  @IsString()
  @MaxLength(160)
  clientId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(["amount", "items"])
  activeTab: "amount" | "items";

  @IsString()
  @MaxLength(20)
  amountInput: string;

  @IsString()
  @MaxLength(2_000)
  description: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaveSaleDraftItemDto)
  items: SaveSaleDraftItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  paymentMethod?: string;

  @IsEnum(["full", "part"])
  installmentType: "full" | "part";

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @IsBoolean()
  hasSetInstallment: boolean;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}
