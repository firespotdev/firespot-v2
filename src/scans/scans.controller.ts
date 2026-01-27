import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { ScansService } from './scans.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { InsightsQueryDto, DateRangePreset } from './dto/insights-query.dto'
import { RecordCopyDto } from './dto/record-copy.dto'

@ApiTags('scans')
@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post('copy/:serialNumber')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record account number copy event' })
  @ApiParam({ name: 'serialNumber', description: 'QR Kit serial number' })
  @ApiBody({ type: RecordCopyDto, required: false })
  @ApiResponse({ status: 200, description: 'Copy event recorded' })
  @ApiResponse({
    status: 404,
    description: 'QR kit not found or no scan found for this QR kit',
  })
  async recordAccountCopy(
    @Param('serialNumber') serialNumber: string,
    @Body() body: RecordCopyDto,
  ) {
    return this.scansService.recordAccountCopyBySerial(
      serialNumber,
      body?.accountNumber,
      body?.bankName,
    )
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

  @Get('merchant/insights')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get comprehensive insights for authenticated merchant',
    description:
      'Returns traffic, QR kit scans, account copies, transfer attempts with date range filtering',
  })
  @ApiQuery({
    name: 'preset',
    enum: DateRangePreset,
    required: false,
    description: 'Predefined date range preset',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for custom range (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for custom range (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant insights retrieved successfully',
  })
  async getMerchantInsights(
    @Request() req,
    @Query() query: InsightsQueryDto,
  ) {
    return this.scansService.getMerchantInsights(req.user.userId, query)
  }
}
