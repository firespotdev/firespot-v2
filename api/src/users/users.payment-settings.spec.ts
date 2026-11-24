jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
  customAlphabet: () => () => 'test-slug',
}));

import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service';

describe('UsersService - updatePaymentSettings', () => {
  const userModel = {
    findById: jest.fn(),
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(
      userModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('throws NOT_FOUND when user does not exist', async () => {
    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.updatePaymentSettings('unknown-user', {
        savedCardsCheckoutEnabled: true,
      }),
    ).rejects.toThrow(
      new HttpException('User not found', HttpStatus.NOT_FOUND),
    );
  });

  it('rejects enabling savedCardsCheckoutEnabled when merchant has no plan', async () => {
    const user = {
      _id: new Types.ObjectId(),
      planTier: undefined,
      planStatus: 'none',
      savedCardsCheckoutEnabled: false,
      save: jest.fn(),
    };

    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });

    await expect(
      service.updatePaymentSettings(String(user._id), {
        savedCardsCheckoutEnabled: true,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(user.save).not.toHaveBeenCalled();
  });

  it('rejects enabling savedCardsCheckoutEnabled when merchant KYC is incomplete', async () => {
    const user = {
      _id: new Types.ObjectId(),
      planTier: 'PRO',
      planStatus: 'paid', // not yet verified
      kycCompletedAt: null,
      savedCardsCheckoutEnabled: false,
      save: jest.fn(),
    };

    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });

    await expect(
      service.updatePaymentSettings(String(user._id), {
        savedCardsCheckoutEnabled: true,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(user.save).not.toHaveBeenCalled();
  });

  it('allows disabling savedCardsCheckoutEnabled even without a plan', async () => {
    const user = {
      _id: new Types.ObjectId(),
      planTier: undefined,
      savedCardsCheckoutEnabled: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });

    const res = await service.updatePaymentSettings(String(user._id), {
      savedCardsCheckoutEnabled: false,
    });

    expect(res).toEqual(
      expect.objectContaining({
        message: 'Payment settings updated',
        savedCardsCheckoutEnabled: false,
        paystackCollectionEnabled: false,
        bankTransferEnabled: true,
      }),
    );
    expect(user.savedCardsCheckoutEnabled).toBe(false);
    expect(user.save).toHaveBeenCalled();
  });

  it('allows enabling savedCardsCheckoutEnabled when merchant is verified with a plan', async () => {
    const user = {
      _id: new Types.ObjectId(),
      planTier: 'PRO',
      planStatus: 'verified',
      kycCompletedAt: new Date(),
      savedCardsCheckoutEnabled: false,
      save: jest.fn().mockResolvedValue(undefined),
    };

    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });

    const res = await service.updatePaymentSettings(String(user._id), {
      savedCardsCheckoutEnabled: true,
    });

    expect(res).toEqual(
      expect.objectContaining({
        message: 'Payment settings updated',
        savedCardsCheckoutEnabled: true,
        paystackCollectionEnabled: false,
        bankTransferEnabled: true,
      }),
    );
    expect(user.savedCardsCheckoutEnabled).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });

  it('persists Paystack collection changes for a verified PRO merchant', async () => {
    const user = {
      _id: new Types.ObjectId(),
      planTier: 'PRO',
      planStatus: 'verified',
      kycCompletedAt: new Date(),
      savedCardsCheckoutEnabled: true,
      paystackCollectionEnabled: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });

    const res = await service.updatePaymentSettings(String(user._id), {
      paystackCollectionEnabled: false,
    });

    expect(res).toEqual(
      expect.objectContaining({
        message: 'Payment settings updated',
        savedCardsCheckoutEnabled: true,
        paystackCollectionEnabled: false,
        bankTransferEnabled: true,
      }),
    );
    expect(user.paystackCollectionEnabled).toBe(false);
    expect(user.save).toHaveBeenCalled();
  });

  it('allows a verified LITE merchant to enable Paystack payments', async () => {
    const user = {
      _id: new Types.ObjectId(),
      planTier: 'LITE',
      planStatus: 'verified',
      kycCompletedAt: new Date(),
      paystackCollectionEnabled: false,
      save: jest.fn().mockResolvedValue(undefined),
    };

    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });

    const res = await service.updatePaymentSettings(String(user._id), {
      paystackCollectionEnabled: true,
    });

    expect(res.paystackCollectionEnabled).toBe(true);
    expect(user.paystackCollectionEnabled).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });

  it('allows a merchant to disable manual bank transfer without a plan', async () => {
    const user = {
      _id: new Types.ObjectId(),
      planTier: undefined,
      bankTransferEnabled: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });

    const res = await service.updatePaymentSettings(String(user._id), {
      bankTransferEnabled: false,
    });

    expect(res.bankTransferEnabled).toBe(false);
    expect(user.bankTransferEnabled).toBe(false);
    expect(user.save).toHaveBeenCalled();
  });

  it('rejects channel selection for a LITE merchant', async () => {
    const user = {
      _id: new Types.ObjectId(),
      planTier: 'LITE',
      planStatus: 'verified',
      kycCompletedAt: new Date(),
      save: jest.fn(),
    };

    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });

    await expect(
      service.updatePaymentSettings(String(user._id), {
        paystackCollectionChannels: ['card', 'ussd'],
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(user.save).not.toHaveBeenCalled();
  });

  it('persists channel selection for a PRO merchant', async () => {
    const user = {
      _id: new Types.ObjectId(),
      planTier: 'PRO',
      planStatus: 'verified',
      kycCompletedAt: new Date(),
      paystackCollectionChannels: [] as string[],
      save: jest.fn().mockResolvedValue(undefined),
    };

    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });

    const res = await service.updatePaymentSettings(String(user._id), {
      paystackCollectionChannels: ['card', 'ussd'],
    });

    expect(res.paystackCollectionChannels).toEqual(['card', 'ussd']);
    expect(user.paystackCollectionChannels).toEqual(['card', 'ussd']);
    expect(user.save).toHaveBeenCalled();
  });
  describe('keeping a way to get paid', () => {
    const bankOnlyMerchant = () => ({
      _id: new Types.ObjectId(),
      planStatus: 'none',
      bankTransferEnabled: true,
      bankAccounts: [{ accountNumber: '0123456789', isEnabled: true }],
      save: jest.fn().mockResolvedValue(undefined),
    });

    it('refuses to switch off bank transfer when it is the only way to get paid', async () => {
      const user = bankOnlyMerchant();
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      await expect(
        service.updatePaymentSettings(String(user._id), {
          bankTransferEnabled: false,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(user.save).not.toHaveBeenCalled();
    });

    it('allows switching off bank transfer while Paystack takes payment', async () => {
      const user = {
        ...bankOnlyMerchant(),
        planTier: 'LITE',
        planStatus: 'verified',
        kycCompletedAt: new Date(),
        paystackSubaccountCode: 'ACCT_x',
        paystackCollectionEnabled: true,
      };
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      const res = await service.updatePaymentSettings(String(user._id), {
        bankTransferEnabled: false,
      });

      expect(res.bankTransferEnabled).toBe(false);
      expect(user.save).toHaveBeenCalled();
    });

    it('refuses to switch off the last enabled bank account', async () => {
      const user = bankOnlyMerchant();
      userModel.findById.mockResolvedValue(user);

      await expect(
        service.setBankAccountEnabled(String(user._id), '0123456789', false),
      ).rejects.toThrow(BadRequestException);
      expect(user.save).not.toHaveBeenCalled();
    });
  });
});
