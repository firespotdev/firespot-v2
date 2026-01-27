import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, Min, Max, IsMongoId, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'

export class BulkCreateQRKitDto {
  @ApiProperty({
    description: 'Number of QRKits to create in bulk',
    example: 50,
    minimum: 1,
    maximum: 200,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  quantity: number

  @ApiPropertyOptional({
    description: 'Agent ID to assign QRKits to (optional)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsOptional()
  agentId?: string
}
