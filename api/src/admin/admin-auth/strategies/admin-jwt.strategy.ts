import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Admin, AdminDocument } from "../../schemas/admin.schema";

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, "admin-jwt") {
  constructor(
    private configService: ConfigService,
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("ADMIN_JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    const admin = await this.adminModel.findOne({
      adminId: payload.sub,
      isActive: true,
    });

    if (!admin) {
      throw new UnauthorizedException("Admin not found or inactive");
    }

    return {
      adminId: admin.adminId,
      role: admin.role,
    };
  }
}
