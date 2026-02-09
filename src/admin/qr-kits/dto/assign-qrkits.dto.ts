import { ApiProperty } from "@nestjs/swagger";
import {
  IsMongoId,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";

export class AssignQRKitsDto {
  @ApiProperty({
    description: "Agent ID (MongoDB ObjectId)",
    example: "507f1f77bcf86cd799439011",
  })
  @IsMongoId()
  agentId: string;

  @ApiProperty({
    description: "Array of QRKit IDs to assign (1-200)",
    example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsMongoId({ each: true })
  qrKitIds: string[];
}

export class ReassignQRKitsDto {
  @ApiProperty({
    description: "Source Agent ID (MongoDB ObjectId)",
    example: "507f1f77bcf86cd799439011",
  })
  @IsMongoId()
  fromAgentId: string;

  @ApiProperty({
    description: "Target Agent ID (MongoDB ObjectId)",
    example: "507f1f77bcf86cd799439012",
  })
  @IsMongoId()
  toAgentId: string;

  @ApiProperty({
    description: "Array of QRKit IDs to transfer (1-200)",
    example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsMongoId({ each: true })
  qrKitIds: string[];
}

export class UnassignQRKitsDto {
  @ApiProperty({
    description: "Array of QRKit IDs to unassign (1-200)",
    example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsMongoId({ each: true })
  qrKitIds: string[];
}
