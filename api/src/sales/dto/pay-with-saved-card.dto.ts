import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class SaveCardFromSaleDto {
  @IsOptional()
  @IsString()
  customerFingerprint?: string;
}

export class PayWithSavedCardDto {
  @IsMongoId()
  cardId: string;

  @IsOptional()
  @IsString()
  customerFingerprint?: string;
}
