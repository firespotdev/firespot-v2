import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class AgentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['active', 'inactive', 'suspended'],
  })
  @IsIn(['active', 'inactive', 'suspended'])
  @IsOptional()
  status?: string

  @ApiPropertyOptional({
    description: 'Filter by state',
    example: 'Ogun',
  })
  @IsString()
  @IsOptional()
  state?: string

  @ApiPropertyOptional({
    description: 'Filter by Local Government Area',
    example: 'Abeokuta North',
  })
  @IsString()
  @IsOptional()
  lga?: string

  @ApiPropertyOptional({
    description: 'Search by name, agentId, or phone number',
    example: 'John',
  })
  @IsString()
  @IsOptional()
  search?: string

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 50,
    default: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number
}
