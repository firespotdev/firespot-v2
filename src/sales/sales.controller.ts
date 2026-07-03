import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SalesService } from './sales.service';
import { CreatePendingSaleDto } from './dto/create-pending-sale.dto';
import { RecordSaleDto } from './dto/record-sale.dto';
import { EditSaleDto } from './dto/edit-sale.dto';
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
  @ApiOperation({ summary: 'Create a dynamic pending collect sale' })
  @Post('collect')
  async createPendingCollectSale(
    @GetUser() user: User,
    @Body() dto: CreatePendingSaleDto,
  ) {
    return this.salesService.createPendingCollectSale((user as any).userId, dto);
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
  @ApiOperation({ summary: 'Get customer payment history' })
  @Get('customer/history')
  async getCustomerHistory(@GetUser() user: User) {
    return this.salesService.getCustomerSalesHistory(user.phoneNumber);
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
  @ApiOperation({ summary: 'Get a single sale' })
  @Get(':id')
  async getSale(@GetUser() user: User, @Param('id') id: string) {
    return this.salesService.getSaleById((user as any).userId, id);
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
  @ApiOperation({ summary: 'Edit a confirmed sale' })
  @Patch(':id/edit')
  async editSale(
    @GetUser() user: User,
    @Param('id') saleId: string,
    @Body() dto: EditSaleDto,
  ) {
    return this.salesService.editSale((user as any).userId, saleId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Archive a sale' })
  @Patch(':id/archive')
  async archiveSale(
    @GetUser() user: User,
    @Param('id') saleId: string,
  ) {
    return this.salesService.archiveSale((user as any).userId, saleId);
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

  @ApiOperation({ summary: 'Upload customer payment receipt screenshot' })
  @Post(':id/receipt')
  @UseInterceptors(FileInterceptor('receipt'))
  async uploadReceipt(
    @Param('id') saleId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.salesService.uploadReceipt(saleId, file.buffer);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get customer outstanding sales' })
  @Get('customer/:customerId/outstanding')
  async getCustomerOutstandingSales(
    @GetUser() user: User,
    @Param('customerId') customerId: string,
  ) {
    return this.salesService.getCustomerOutstandingSales(
      (user as any).userId,
      customerId,
    );
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record a repayment for an outstanding sale' })
  @Post(':id/repayment')
  async recordRepayment(
    @GetUser() user: User,
    @Param('id') saleId: string,
    @Body() dto: { amountPaid: number; paymentMethod?: string; customerId?: string },
  ) {
    return this.salesService.recordRepayment(
      (user as any)?.userId,
      saleId,
      dto,
    );
  }
}


