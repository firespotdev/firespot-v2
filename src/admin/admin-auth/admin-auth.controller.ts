import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AdminAuthService } from "./admin-auth.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { AdminJwtAuthGuard } from "./guards/admin-jwt-auth.guard";

@ApiTags("admin-auth")
@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post("login")
  @ApiOperation({ summary: "Admin login" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    schema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        admin: {
          type: "object",
          properties: {
            adminId: { type: "string" },
            name: { type: "string" },
            role: { type: "string" },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() loginDto: AdminLoginDto) {
    return this.adminAuthService.login(loginDto);
  }

  @Get("me")
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth("admin-jwt")
  @ApiOperation({ summary: "Get current admin profile" })
  @ApiResponse({
    status: 200,
    description: "Admin profile retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMe(@Request() req) {
    return this.adminAuthService.getAdminProfile(req.user.adminId);
  }
}
