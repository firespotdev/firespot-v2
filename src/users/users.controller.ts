import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UsersService } from './users.service'
import { PaystackService } from './services/paystack.service'
import { AddBankAccountDto } from './dto/add-bank-account.dto'
import { UpdateMerchantSlugDto } from './dto/update-merchant-slug.dto'
import { VerifyAccountDto } from './dto/verify-account.dto'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly paystackService: PaystackService,
  ) {}

  @Get('banks')
  @ApiOperation({
    summary: 'Get list of Nigerian banks',
    description:
      'Retrieves a list of all Nigerian banks from Paystack. Used for bank selection during profile setup.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of banks retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        banks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Access Bank' },
              code: { type: 'string', example: '044' },
              slug: { type: 'string', example: 'access-bank' },
            },
          },
        },
      },
    },
  })
  async getBanks() {
    const banks = await this.paystackService.getBanks()
    return {
      banks: banks.map((bank) => ({
        name: bank.name,
        code: bank.code,
        slug: bank.slug,
      })),
    }
  }

  @Post('bank-accounts/resolve')
  @ApiOperation({
    summary: 'Resolve bank account',
    description:
      'Verifies a bank account number and returns the account name. Uses Paystack API.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account resolved successfully',
    schema: {
      type: 'object',
      properties: {
        accountName: { type: 'string', example: 'JOHN DOE' },
        accountNumber: { type: 'string', example: '0123456789' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid account details' })
  async resolveAccount(@Body() dto: VerifyAccountDto) {
    return this.usersService.verifyBankAccount(dto)
  }

  @Post('bank-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add bank account',
    description:
      "Adds a new bank account to the user's profile. Verifies the account with Paystack before adding.",
  })
  @ApiResponse({
    status: 201,
    description: 'Bank account added successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Bank account added successfully' },
        bankAccount: {
          type: 'object',
          properties: {
            bankName: { type: 'string', example: 'Access Bank' },
            bankCode: { type: 'string', example: '044' },
            accountNumber: { type: 'string', example: '0123456789' },
            accountName: { type: 'string', example: 'JOHN DOE' },
            isPrimary: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid account details or account already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async addBankAccount(@Request() req, @Body() dto: AddBankAccountDto) {
    return this.usersService.addBankAccount(req.user.userId, dto)
  }

  @Get('bank-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get bank accounts',
    description:
      'Retrieves all bank accounts associated with the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank accounts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        bankAccounts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bankName: { type: 'string' },
              bankCode: { type: 'string' },
              accountNumber: { type: 'string' },
              accountName: { type: 'string' },
              isPrimary: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getBankAccounts(@Request() req) {
    return this.usersService.getBankAccounts(req.user.userId)
  }

  @Patch('bank-accounts/:accountNumber/primary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Set primary bank account',
    description:
      'Sets a bank account as the primary account. Only one account can be primary at a time.',
  })
  @ApiParam({
    name: 'accountNumber',
    description: 'Account number to set as primary',
    example: '0123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Primary bank account updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'No bank accounts found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account not found',
  })
  async setPrimaryBankAccount(
    @Request() req,
    @Param('accountNumber') accountNumber: string,
  ) {
    return this.usersService.setPrimaryBankAccount(
      req.user.userId,
      accountNumber,
    )
  }

  @Delete('bank-accounts/:accountNumber')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete bank account',
    description:
      "Deletes a bank account from the user's profile. Cannot delete the only remaining account.",
  })
  @ApiParam({
    name: 'accountNumber',
    description: 'Account number to delete',
    example: '0123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank account deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete the only bank account',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account not found',
  })
  async deleteBankAccount(
    @Request() req,
    @Param('accountNumber') accountNumber: string,
  ) {
    return this.usersService.deleteBankAccount(req.user.userId, accountNumber)
  }

  @Patch('photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update profile photo',
    description:
      'Uploads a new profile photo. Accepts JPG, JPEG, PNG, or WEBP formats. Maximum file size is 5MB.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description:
            'Profile photo image file (JPG, JPEG, PNG, WEBP, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile photo updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Profile photo updated successfully',
        },
        profilePhotoUrl: {
          type: 'string',
          example: 'https://res.cloudinary.com/.../profile.jpg',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or file too large',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async updatePhoto(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.updateProfilePhoto(req.user.userId, file)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user profile',
    description:
      "Retrieves the authenticated user's complete profile information.",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        phoneNumber: { type: 'string' },
        phoneCountryCode: { type: 'string', example: '+234' },
        fullPhoneNumber: { type: 'string', example: '+2348179542786' },
        businessName: { type: 'string', nullable: true },
        bankAccounts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bankName: { type: 'string' },
              bankCode: { type: 'string' },
              accountNumber: { type: 'string' },
              accountName: { type: 'string' },
              isPrimary: { type: 'boolean' },
            },
          },
        },
        profilePhotoUrl: { type: 'string', nullable: true },
        referralCode: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getProfile(@Request() req) {
    return this.usersService.getUserProfile(req.user.userId)
  }

  @Get('me/qr-kits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user QR kits',
    description:
      "Retrieves all QR kits associated with the authenticated user's account.",
  })
  @ApiResponse({
    status: 200,
    description: 'QR kits retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              serialNumber: { type: 'string' },
              activationStatus: {
                type: 'string',
                enum: ['pending', 'activated', 'deactivated'],
              },
              paymentStatus: {
                type: 'string',
                enum: ['pending', 'successful', 'failed'],
              },
              activationAmount: { type: 'number' },
              qrCodeSvgUrl: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getUserQRKits(@Request() req) {
    return this.usersService.getUserQRKits(req.user.userId)
  }

  @Get('me/qr-kits/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get single QR kit',
    description:
      "Retrieves a specific QR kit by ID that belongs to the authenticated user.",
  })
  @ApiParam({
    name: 'id',
    description: 'QR Kit ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'QR kit retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        serialNumber: { type: 'string' },
        activationStatus: {
          type: 'string',
          enum: ['pending', 'activated', 'deactivated'],
        },
        paymentStatus: {
          type: 'string',
          enum: ['pending', 'successful', 'failed'],
        },
        activationAmount: { type: 'number' },
        qrCodeSvgUrl: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'QR kit not found or does not belong to user',
  })
  async getUserQRKit(@Request() req, @Param('id') id: string) {
    return this.usersService.getUserQRKitById(req.user.userId, id)
  }

  @Patch('me/slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update merchant slug',
    description:
      'Updates the merchant slug (6 alphanumeric characters) for direct sharing. Must be unique.',
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant slug updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Merchant slug updated successfully',
        },
        merchantSlug: { type: 'string', example: 'ABC123' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid slug format or slug already taken',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async updateMerchantSlug(@Request() req, @Body() dto: UpdateMerchantSlugDto) {
    return this.usersService.updateMerchantSlug(
      req.user.userId,
      dto.merchantSlug,
    )
  }
}
