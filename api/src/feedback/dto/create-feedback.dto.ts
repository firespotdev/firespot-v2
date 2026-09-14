import {
  IsInt,
  IsMongoId,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateFeedbackDto {
  @IsMongoId()
  saleId: string;

  @IsString()
  @MaxLength(80)
  serialNumber: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  comment: string;
}
