import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { Admin, AdminDocument } from "../schemas/admin.schema";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: AdminLoginDto) {
    const { adminId, password } = loginDto;

    // Find admin
    const admin = await this.adminModel.findOne({ adminId, isActive: true });

    if (!admin) {
      throw new UnauthorizedException("Invalid admin ID or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid admin ID or password");
    }

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    // Generate JWT token
    const payload = { sub: admin.adminId, role: admin.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      admin: {
        adminId: admin.adminId,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async changePassword(adminId: string, dto: ChangePasswordDto) {
    const admin = await this.adminModel.findOne({ adminId, isActive: true });

    if (!admin) {
      throw new HttpException("Admin not found", HttpStatus.NOT_FOUND);
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      admin.password,
    );

    if (!isCurrentValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    admin.password = await bcrypt.hash(dto.newPassword, 10);
    await admin.save();

    return { message: "Password changed successfully" };
  }

  async getAdminProfile(adminId: string) {
    const admin = await this.adminModel
      .findOne({ adminId, isActive: true })
      .select("-password");

    if (!admin) {
      throw new HttpException("Admin not found", HttpStatus.NOT_FOUND);
    }

    const adminObj = admin.toObject() as any;
    return {
      adminId: admin.adminId,
      name: admin.name,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
      createdAt: adminObj.createdAt,
    };
  }
}
