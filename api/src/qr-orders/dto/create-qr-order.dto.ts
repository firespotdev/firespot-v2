import {
  IsInt,
  IsIn,
  ValidateIf,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateQROrderDto {
  @IsOptional()
  @IsIn(["physical", "digital"])
  kitType?: "physical" | "digital";

  @IsOptional()
  @IsMongoId()
  qrKitId?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;

  @ValidateIf((order: CreateQROrderDto) => order.kitType !== "digital")
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ValidateIf((order: CreateQROrderDto) => order.kitType !== "digital")
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ValidateIf((order: CreateQROrderDto) => order.kitType !== "digital")
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lga?: string;

  @ValidateIf((order: CreateQROrderDto) => order.kitType !== "digital")
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  deliveryAddress?: string;
}
