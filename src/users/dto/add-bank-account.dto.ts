import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AddBankAccountDto {
  @ApiProperty({
    description: 'Bank name',
    example: 'Access Bank',
  })
  @IsString()
  @IsNotEmpty()
  bankName: string

  @ApiProperty({
    description: 'Bank code (from Paystack banks list)',
    example: '044',
  })
  @IsString()
  @IsNotEmpty()
  bankCode: string

  @ApiProperty({
    description: 'NUBAN account number (exactly 10 digits)',
    example: '0123456789',
    pattern: '^\\d{10}$',
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Account number must contain only digits' })
  accountNumber: string

  @ApiProperty({
    description: 'Set as primary account (only one can be primary)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean
}
