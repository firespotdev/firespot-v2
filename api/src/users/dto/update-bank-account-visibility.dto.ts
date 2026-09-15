import { IsBoolean } from "class-validator";

export class UpdateBankAccountVisibilityDto {
  @IsBoolean()
  enabled: boolean;
}
