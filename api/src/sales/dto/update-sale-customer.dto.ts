import { IsMongoId, IsString } from "class-validator";

export class UpdateSaleCustomerDto {
  @IsMongoId()
  @IsString()
  customerId: string;
}
