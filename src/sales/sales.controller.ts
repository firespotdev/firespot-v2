import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreatePendingSaleDto } from './dto/create-pending-sale.dto';
import { RecordSaleDto } from './dto/record-sale.dto';
import { SalesQueryDto } from './dto/sales-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../schemas/user.schema';

@ApiTags('sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @ApiOperation({ summary: 'Create a pending sale' })
  @Post('pending')
  async createPendingSale(@Body() dto: CreatePendingSaleDto) {
    return this.salesService.createPendingSale(dto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a manual confirmed sale' })
  @Post()
  async createManualSale(
    @GetUser() user: User,
    @Body() dto: RecordSaleDto,
  ) {
    return this.salesService.createManualSale((user as any).userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get merchant sales history' })
  @Get()
  async getSales(@GetUser() user: User, @Query() query: SalesQueryDto) {
    return this.salesService.getSales((user as any).userId, query);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get merchant sales statistics' })
  @Get('stats')
  async getSalesStats(@GetUser() user: User, @Query() query: SalesQueryDto) {
    return this.salesService.getSalesStats((user as any).userId, query);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record/confirm a pending sale' })
  @Patch(':id/record')
  async recordSale(
    @GetUser() user: User,
    @Param('id') saleId: string,
    @Body() dto: RecordSaleDto,
  ) {
    return this.salesService.recordSale((user as any).userId, saleId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel a pending sale' })
  @Patch(':id/cancel')
  async cancelSale(
    @GetUser() user: User,
    @Param('id') saleId: string,
  ) {
    return this.salesService.cancelSale((user as any).userId, saleId);
  }
}

