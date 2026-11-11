import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  ExpensesQueryDto,
  RecordExpenseDto,
  RecordExpenseRepaymentDto,
} from "./dto/expense.dto";
import { SupplierDto, SuppliersQueryDto } from "./dto/supplier.dto";
import { ExpensesService } from "./expenses.service";
import { SuppliersService } from "./suppliers.service";

interface AuthUser {
  userId: string;
}

@ApiTags("expenses")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @ApiOperation({ summary: "Record an expense" })
  @Post()
  record(@GetUser() user: AuthUser, @Body() dto: RecordExpenseDto) {
    return this.expensesService.record(user.userId, dto);
  }

  @ApiOperation({ summary: "List the business's expenses, newest first" })
  @Get()
  list(@GetUser() user: AuthUser, @Query() query: ExpensesQueryDto) {
    return this.expensesService.list(user.userId, query);
  }

  @ApiOperation({ summary: "Get one expense" })
  @Get(":id")
  findOne(@GetUser() user: AuthUser, @Param("id") id: string) {
    return this.expensesService.findOne(user.userId, id);
  }

  @ApiOperation({ summary: "Edit an expense (allowed once)" })
  @Patch(":id/edit")
  edit(
    @GetUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: RecordExpenseDto,
  ) {
    return this.expensesService.edit(user.userId, id, dto);
  }

  @ApiOperation({ summary: "Archive an expense" })
  @Patch(":id/archive")
  archive(@GetUser() user: AuthUser, @Param("id") id: string) {
    return this.expensesService.archive(user.userId, id);
  }

  @ApiOperation({ summary: "Record a repayment against an owing expense" })
  @Post(":id/repayment")
  recordRepayment(
    @GetUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: RecordExpenseRepaymentDto,
  ) {
    return this.expensesService.recordRepayment(user.userId, id, dto);
  }
}

@ApiTags("suppliers")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @ApiOperation({ summary: "List saved suppliers" })
  @Get()
  list(@GetUser() user: AuthUser, @Query() query: SuppliersQueryDto) {
    return this.suppliersService.list(user.userId, query.search);
  }

  @ApiOperation({ summary: "Save a supplier contact" })
  @Post()
  create(@GetUser() user: AuthUser, @Body() dto: SupplierDto) {
    return this.suppliersService.create(user.userId, dto);
  }

  @ApiOperation({ summary: "Edit a supplier contact" })
  @Patch(":id")
  update(
    @GetUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: SupplierDto,
  ) {
    return this.suppliersService.update(user.userId, id, dto);
  }

  @ApiOperation({ summary: "Delete a supplier contact" })
  @Delete(":id")
  remove(@GetUser() user: AuthUser, @Param("id") id: string) {
    return this.suppliersService.remove(user.userId, id);
  }
}
