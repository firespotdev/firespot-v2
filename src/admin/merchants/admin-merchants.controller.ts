import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminMerchantsService } from './admin-merchants.service'
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard'

@Controller('admin/merchants')
@UseGuards(AdminJwtAuthGuard)
export class AdminMerchantsController {
  constructor(private readonly merchantsService: AdminMerchantsService) {}

  @Get()
  async getMerchants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive',
  ) {
    return this.merchantsService.getMerchants({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
    })
  }

  @Get('stats')
  async getStats() {
    return this.merchantsService.getStats()
  }

  @Get(':id')
  async getMerchantById(@Param('id') id: string) {
    return this.merchantsService.getMerchantById(id)
  }
}

