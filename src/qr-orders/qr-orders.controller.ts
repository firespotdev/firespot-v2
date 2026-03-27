import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QROrdersService } from './qr-orders.service';
import { CreateQROrderDto } from './dto/create-qr-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../schemas/user.schema';

@ApiTags('qr-orders')
@Controller('qr-orders')
export class QROrdersController {
  constructor(private readonly ordersService: QROrdersService) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create new QR kit order and initialize payment' })
  @Post()
  async createOrder(@GetUser() user: User, @Body() dto: CreateQROrderDto) {
    return this.ordersService.createOrder((user as any).userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verify order payment status' })
  @Get('verify/:reference')
  async verifyOrderPayment(@Param('reference') reference: string) {
    return this.ordersService.verifyPayment(reference);
  }
}
