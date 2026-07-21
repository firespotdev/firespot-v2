import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Upper bound on a single order. Kits are free, so an unbounded quantity is a
 * standing invitation to mint entitlements. QR_KIT_MAX_PER_ORDER is the
 * authoritative cap (enforced in QROrdersService); this is the static ceiling.
 */
const MAX_QUANTITY_CEILING = 100;

export class CreateQROrderDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY_CEILING)
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
