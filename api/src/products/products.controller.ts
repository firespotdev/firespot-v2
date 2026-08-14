import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ProductsService } from './products.service'
import {
  CreateCategoriesDto,
  CreateProductDto,
  RestoreProductDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from './dto/product.dto'

@ApiTags('products')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('products')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  create(
    @Request() req: any,
    @Body() dto: CreateProductDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    image?: Express.Multer.File,
  ) {
    return this.productsService.create(req.user.userId, dto, image)
  }

  @Get('products')
  findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('archived') archived?: string,
  ) {
    return this.productsService.findAll(req.user.userId, search, categoryId, archived === 'true')
  }

  @Patch('products/:id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateProductDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    image?: Express.Multer.File,
  ) {
    return this.productsService.update(id, req.user.userId, dto, image)
  }

  @Delete('products/:id')
  archive(@Param('id') id: string, @Request() req: any) {
    return this.productsService.archive(id, req.user.userId)
  }

  @Post('products/:id/restore')
  restore(@Param('id') id: string, @Request() req: any, @Body() dto: RestoreProductDto) {
    return this.productsService.restore(id, req.user.userId, dto.categoryId)
  }

  @Post('product-categories')
  createCategories(@Request() req: any, @Body() dto: CreateCategoriesDto) {
    return this.productsService.createCategories(req.user.userId, dto)
  }

  @Get('product-categories')
  listCategories(@Request() req: any, @Query('search') search?: string) {
    return this.productsService.listCategories(req.user.userId, search)
  }

  @Patch('product-categories/:id')
  updateCategory(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateCategoryDto) {
    return this.productsService.updateCategory(id, req.user.userId, dto)
  }

  @Delete('product-categories/:id')
  deleteCategory(@Param('id') id: string, @Request() req: any) {
    return this.productsService.deleteCategory(id, req.user.userId)
  }
}
