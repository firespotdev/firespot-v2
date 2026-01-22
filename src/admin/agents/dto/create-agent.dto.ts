import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Matches,
} from 'class-validator'

export class CreateAgentDto {
  @ApiProperty({
    description: 'Agent full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    description: 'Phone number (Nigerian format)',
    example: '08012345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0[7-9][0-1]\d{8}$/, {
    message: 'Invalid Nigerian phone number format',
  })
  phoneNumber: string

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string

  @ApiPropertyOptional({
    description: 'Nigerian state',
    example: 'Ogun',
  })
  @IsString()
  @IsOptional()
  state?: string

  @ApiPropertyOptional({
    description: 'Local Government Area',
    example: 'Abeokuta North',
  })
  @IsString()
  @IsOptional()
  lga?: string

  @ApiPropertyOptional({
    description: 'Bus stop location',
    example: 'Obantoko',
  })
  @IsString()
  @IsOptional()
  bustop?: string

  @ApiPropertyOptional({
    description: 'Admin notes about the agent',
  })
  @IsString()
  @IsOptional()
  notes?: string
}
