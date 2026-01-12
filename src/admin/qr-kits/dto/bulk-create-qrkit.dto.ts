import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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
  quantity: number;
}
