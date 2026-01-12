import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQRKitDto {
  @ApiProperty({
    description: 'Number of QRKits to create (default: 1)',
    example: 1,
    required: false,
    minimum: 1,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1)
  quantity?: number;
}
