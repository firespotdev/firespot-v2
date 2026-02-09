import { Module } from "@nestjs/common";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminJwtStrategy } from "./strategies/admin-jwt.strategy";
import { AdminJwtAuthGuard } from "./guards/admin-jwt-auth.guard";
import { Admin, AdminSchema } from "../schemas/admin.schema";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "admin-jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        return {
          secret: configService.get<string>("ADMIN_JWT_SECRET"),
          signOptions: {
            expiresIn: configService.get("ADMIN_JWT_EXPIRES_IN", "24h"),
          },
        } as JwtModuleOptions;
      },
    }),
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtStrategy, AdminJwtAuthGuard],
  exports: [AdminJwtAuthGuard, AdminJwtStrategy, PassportModule],
})
export class AdminAuthModule {}
