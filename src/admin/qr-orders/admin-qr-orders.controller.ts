import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminQROrdersService } from './admin-qr-orders.service';

@Controller('admin/qr-orders')
@UseGuards(AdminJwtAuthGuard)
export class AdminQROrdersController {
  constructor(private adminOrdersService: AdminQROrdersService) {}

  @Get()
  async listOrders(
    @Query('orderStatus') orderStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.adminOrdersService.listOrders({ orderStatus, paymentStatus });
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return this.adminOrdersService.getOrderById(id);
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.adminOrdersService.updateOrderStatus(id, status);
  }
}
