import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger'
import { ScansService } from './scans.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('scans')
@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post('copy/:serialNumber')
  @ApiOperation({ summary: 'Record account number copy event' })
  @ApiParam({ name: 'serialNumber', description: 'QR Kit serial number' })
  @ApiResponse({ status: 200, description: 'Copy event recorded' })
  async recordAccountCopy(@Param('serialNumber') serialNumber: string) {
    return this.scansService.recordAccountCopyBySerial(serialNumber)
  }

  @Get('qr-kit/:qrKitId/count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get scan count for a QR kit' })
  @ApiParam({ name: 'qrKitId', description: 'QR Kit ID' })
  @ApiResponse({ status: 200, description: 'Scan count retrieved' })
  async getScanCountByQRKit(@Param('qrKitId') qrKitId: string) {
    const count = await this.scansService.getScanCountByQRKit(qrKitId)
    return { count }
  }

  @Get('merchant/count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get total scan count for authenticated merchant' })
  @ApiResponse({ status: 200, description: 'Scan count retrieved' })
  async getScanCountByMerchant(@Request() req) {
    const count = await this.scansService.getScanCountByMerchant(
      req.user.userId,
    )
    return { count }
  }

  @Get('merchant/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get comprehensive stats for authenticated merchant',
    description:
      'Returns total scans, scans this week, and returning customers count',
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant stats retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalScans: { type: 'number', example: 150 },
        scansThisWeek: { type: 'number', example: 28 },
        returningCustomers: { type: 'number', example: 7 },
      },
    },
  })
  async getMerchantStats(@Request() req) {
    return this.scansService.getMerchantStats(req.user.userId)
  }
}
