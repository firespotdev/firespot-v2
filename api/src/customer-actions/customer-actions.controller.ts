import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CustomerActionsService } from "./customer-actions.service";
import { SaveCartDraftDto } from "./dto/save-cart-draft.dto";

interface AuthenticatedUser {
  userId: string;
}

@ApiTags("customer-actions")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("customer-actions")
export class CustomerActionsController {
  constructor(
    private readonly customerActionsService: CustomerActionsService,
  ) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.customerActionsService.list(user.userId);
  }

  @Get("cart-drafts/:merchantId")
  getCartDraft(
    @GetUser() user: AuthenticatedUser,
    @Param("merchantId") merchantId: string,
  ) {
    return this.customerActionsService.getCartDraft(user.userId, merchantId);
  }

  @Put("cart-drafts/:merchantId")
  saveCartDraft(
    @GetUser() user: AuthenticatedUser,
    @Param("merchantId") merchantId: string,
    @Body() dto: SaveCartDraftDto,
  ) {
    return this.customerActionsService.saveCartDraft(
      user.userId,
      merchantId,
      dto,
    );
  }

  @Delete("cart-drafts/:merchantId")
  deleteCartDraft(
    @GetUser() user: AuthenticatedUser,
    @Param("merchantId") merchantId: string,
  ) {
    return this.customerActionsService.deleteCartDraft(user.userId, merchantId);
  }
}
