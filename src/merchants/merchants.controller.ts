import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { MerchantsService } from './merchants.service'

@ApiTags('merchants')
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get(':slug')
  @ApiOperation({
    summary: 'Get merchant profile by slug',
    description:
      'Retrieves public merchant profile using the 6-character merchant slug. Used for direct sharing links.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Merchant slug (6 alphanumeric characters)',
    example: 'ABC123',
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        merchantSlug: { type: 'string', example: 'ABC123' },
        businessName: { type: 'string', example: 'John Doe Enterprises' },
        bankAccounts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bankName: { type: 'string', example: 'Access Bank' },
              bankCode: { type: 'string', example: '044' },
              accountNumber: { type: 'string', example: '0123456789' },
              accountName: { type: 'string', example: 'JOHN DOE' },
              isPrimary: { type: 'boolean', example: true },
            },
          },
        },
        profilePhotoUrl: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Merchant has not completed profile setup',
  })
  @ApiResponse({
    status: 404,
    description: 'Merchant not found',
  })
  async getMerchantBySlug(@Param('slug') slug: string) {
    return this.merchantsService.getMerchantBySlug(slug)
  }
}
