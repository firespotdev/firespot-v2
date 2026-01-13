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
}
