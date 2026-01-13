import { Controller, Get, Post, Param, Body, UseGuards, Request, Query } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { QRKitsService } from './qr-kits.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('qr-kits')
@Controller('qr-kits')
export class QRKitsController {
  constructor(private readonly qrKitsService: QRKitsService) {}

  @Get(':serialNumber/check')
  @ApiOperation({
    summary: 'Check QR kit serial number availability',
    description:
      'Checks if a QR kit serial number exists and is available for activation.',
  })
  @ApiParam({
    name: 'serialNumber',
    description: 'QR kit serial number to check',
    example: '23467GART677',
  })
  @ApiResponse({
    status: 200,
    description: 'Serial number check result',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['available', 'already_bound', 'not_found'],
          example: 'available',
        },
        serialNumber: { type: 'string', example: '23467GART677' },
      },
    },
  })
  async checkSerialNumber(@Param('serialNumber') serialNumber: string) {
    return this.qrKitsService.checkSerialNumber(serialNumber)
  }

  @Get(':serialNumber')
  @ApiOperation({
    summary: 'Get merchant profile by QR kit serial number',
    description:
      'Retrieves merchant profile when customer scans the QR code. QR code contains the serial number.',
  })
  @ApiParam({
    name: 'serialNumber',
    description: 'QR kit serial number',
    example: '23467GART677',
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
    description: 'QR kit is not activated or merchant profile incomplete',
  })
  @ApiResponse({
    status: 404,
    description: 'QR kit not found',
  })
  async getQRKitBySerial(@Param('serialNumber') serialNumber: string) {
    return this.qrKitsService.getQRKitBySerial(serialNumber)
  }

  @Post(':serialNumber/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Initiate QR kit activation',
    description:
      'Initiates activation of a QR kit by linking it to the authenticated merchant. Requires payment to complete activation.',
  })
  @ApiParam({
    name: 'serialNumber',
    description: 'QR kit serial number',
    example: '23467GART677',
  })
  @ApiResponse({
    status: 200,
    description: 'Activation initiated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Activation initiated. Please complete payment to activate.',
        },
        serialNumber: { type: 'string', example: '23467GART677' },
        activationAmount: { type: 'number', example: 2000 },
        qrKitId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'QR kit already activated, profile incomplete, or already being activated',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'QR kit not found',
  })
  async initiateActivation(
    @Param('serialNumber') serialNumber: string,
    @Request() req,
  ) {
    return this.qrKitsService.initiateActivation(serialNumber, req.user.userId)
  }

  @Get('verify-payment/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Verify QR kit activation payment',
    description:
      'Verifies a Paystack payment and completes QR kit activation if successful.',
  })
  @ApiParam({
    name: 'reference',
    description: 'Paystack payment reference',
    example: 'qrkit_23467GART677_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment verified and QR kit activated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'QR kit activated successfully' },
        serialNumber: { type: 'string', example: '23467GART677' },
        merchantId: { type: 'string' },
        alreadyActivated: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Payment verification failed',
  })
  @ApiResponse({
    status: 404,
    description: 'QR kit not found for this payment reference',
  })
  async verifyPayment(@Param('reference') reference: string) {
    return this.qrKitsService.completeActivationByReference(reference)
  }
}
