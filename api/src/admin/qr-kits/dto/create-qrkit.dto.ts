import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsMongoId, IsOptional } from "class-validator";

export class CreateQRKitDto {
  @ApiPropertyOptional({
    description: "Agent ID to assign QRKit to (optional)",
    example: "507f1f77bcf86cd799439011",
  })
  @IsMongoId()
  @IsOptional()
  agentId?: string;
}
