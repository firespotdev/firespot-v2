import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SalesService } from './sales.service';
import { CreatePendingSaleDto } from './dto/create-pending-sale.dto';
import { RecordSaleDto } from './dto/record-sale.dto';
import { EditSaleDto } from './dto/edit-sale.dto';
import { SalesQueryDto } from './dto/sales-query.dto';
import { CustomerSaleActionDto } from './dto/customer-sale-action.dto';
import { RecordRepaymentDto } from './dto/record-repayment.dto';
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
  @ApiOperation({ summary: 'Get my activity (payments I made)' })
  @Get('customer/history')
  async getCustomerHistory(@GetUser() user: User) {
    return this.salesService.getMyActivity((user as any).userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Attach me as the payer of a sale (on pay)' })
  @Patch(':id/claim')
  async claimSale(
    @GetUser() user: User,
    @Param('id') saleId: string,
  ) {
    return this.salesService.claimSalePayer(
      saleId,
      (user as any).userId,
    );
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
  @ApiOperation({ summary: 'Get merchant outstanding summary' })
  @Get('outstanding/summary')
  async getOutstandingSummary(@GetUser() user: User) {
    return this.salesService.getOutstandingSummary((user as any).userId);
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
  @ApiOperation({ summary: 'Confirm every active pending sale in full' })
  @Patch('confirm-all')
  async confirmAllSales(@GetUser() user: User) {
    return this.salesService.confirmAllSales((user as any).userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Archive every active pending sale' })
  @Patch('archive-all')
  async archiveAllPendingSales(@GetUser() user: User) {
    return this.salesService.archiveAllPendingSales((user as any).userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirm a pending sale in full' })
  @Patch(':id/confirm')
  async confirmSale(
    @GetUser() user: User,
    @Param('id') saleId: string,
  ) {
    return this.salesService.confirmSale((user as any).userId, saleId);
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

  @ApiOperation({
    summary: 'Get public sale details (customer pay page)',
    description:
      'Unauthenticated, limited view of a sale for the customer paying a dynamic QR. Returns amount, items, status and merchant display info only.',
  })
  @Get(':id/public')
  async getPublicSale(
    @Param('id') saleId: string,
    @Query('serialNumber') serialNumber: string,
  ) {
    return this.salesService.getPublicSaleById(saleId, serialNumber);
  }

  @ApiOperation({ summary: 'Cancel a pending dynamic sale as the customer' })
  @Patch(':id/customer-cancel')
  async cancelSaleAsCustomer(
    @Param('id') saleId: string,
    @Body() dto: CustomerSaleActionDto,
  ) {
    return this.salesService.cancelSaleAsCustomer(saleId, dto.serialNumber);
  }

  @ApiOperation({ summary: 'Tell the merchant that the customer has paid' })
  @Patch(':id/customer-paid')
  async markSalePaidByCustomer(
    @Param('id') saleId: string,
    @Body() dto: CustomerSaleActionDto,
  ) {
    return this.salesService.markSalePaidByCustomer(saleId, dto.serialNumber);
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

  @ApiOperation({
    summary: 'Remove uploaded receipt (customer, pending sales only)',
  })
  @Delete(':id/receipt')
  async deleteReceipt(@Param('id') saleId: string) {
    return this.salesService.deleteReceipt(saleId);
  }

  @ApiOperation({ summary: 'Record customer scanning/accessing link' })
  @Patch(':id/scan')
  async recordScan(@Param('id') saleId: string) {
    return this.salesService.recordScan(saleId);
  }

  @ApiOperation({ summary: 'Record customer copying account number' })
  @Patch(':id/copy')
  async recordCopy(@Param('id') saleId: string) {
    return this.salesService.recordCopy(saleId);
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
    @Body() dto: RecordRepaymentDto,
  ) {
    return this.salesService.recordRepayment(
      (user as any)?.userId,
      saleId,
      dto,
    );
  }
}
