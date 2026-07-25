import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ProductsService } from "./products.service";

class CreateProductDto {
  name: string;
  description?: string;
  price: number;
  category: string;
  variants?: Array<{ size?: string; color?: string; price?: number }>;
  imageUrl?: string;
}

@ApiTags("products")
@Controller("products")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new product" })
  @ApiResponse({ status: 201, description: "Product created successfully" })
  async create(@Request() req, @Body() dto: CreateProductDto) {
    return this.productsService.create(
      req.user.userId,
      dto.name,
      dto.description,
      dto.price,
      dto.category,
      dto.variants,
      dto.imageUrl,
    );
  }

  @Get()
  @ApiOperation({ summary: "Get all products for merchant with filters" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiResponse({ status: 200, description: "List of products" })
  async findAll(
    @Request() req,
    @Query("search") search?: string,
    @Query("category") category?: string,
  ) {
    return this.productsService.findAll(req.user.userId, search, category);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update product details" })
  @ApiResponse({ status: 200, description: "Product updated successfully" })
  async update(@Param("id") id: string, @Request() req, @Body() body: any) {
    return this.productsService.update(id, req.user.userId, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete product" })
  @ApiResponse({ status: 200, description: "Product deleted successfully" })
  async remove(@Param("id") id: string, @Request() req) {
    return this.productsService.remove(id, req.user.userId);
  }
}
