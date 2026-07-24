import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateQROrderDto {
  @IsOptional()
  @IsMongoId()
  qrKitId?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  state: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lga: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  deliveryAddress: string;
}
