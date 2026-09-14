import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { PayoutsService } from "./payouts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";

interface AuthenticatedUser {
  userId: string;
}

@ApiTags("payouts")
@Controller("payouts")
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @ApiBearerAuth("JWT-auth")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get merchant payouts and settlement history" })
  @Get()
  async getPayouts(
    @GetUser() user: AuthenticatedUser,
    @Query("page") page?: number,
    @Query("perPage") perPage?: number,
  ) {
    return this.payoutsService.getPayouts(user.userId, {
      page: page ? Number(page) : 1,
      perPage: perPage ? Number(perPage) : 50,
    });
  }

  @ApiBearerAuth("JWT-auth")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get details for a specific settlement" })
  @Get(":id")
  async getPayoutDetails(
    @GetUser() user: AuthenticatedUser,
    @Param("id") settlementId: string,
    @Query("page") page?: number,
    @Query("perPage") perPage?: number,
  ) {
    return this.payoutsService.getPayoutDetails(user.userId, settlementId, {
      page: page ? Number(page) : 1,
      perPage: perPage ? Number(perPage) : 50,
    });
  }
}
