import { Module, forwardRef } from "@nestjs/common";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { User, UserSchema } from "../schemas/user.schema";
import {
  RefreshToken,
  RefreshTokenSchema,
} from "../schemas/refresh-token.schema";
import { UsersModule } from "../users/users.module";
import { MerchantReferralsModule } from "../merchant-referrals/merchant-referrals.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        return {
          secret: configService.get<string>("JWT_SECRET"),
          signOptions: {
            expiresIn: configService.get("JWT_EXPIRES_IN", "15m"),
          },
        } as JwtModuleOptions;
      },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    forwardRef(() => UsersModule),
    MerchantReferralsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
