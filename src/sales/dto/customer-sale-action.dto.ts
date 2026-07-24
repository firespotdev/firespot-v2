import { IsNotEmpty, IsString } from "class-validator";

export class CustomerSaleActionDto {
  @IsNotEmpty()
  @IsString()
  serialNumber: string;
}
