jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
  customAlphabet: () => () => 'test-slug',
}));

import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
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
    ).rejects.toThrow(new HttpException('User not found', HttpStatus.NOT_FOUND));
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

    expect(res).toEqual({
      message: 'Payment settings updated',
      savedCardsCheckoutEnabled: false,
    });
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

    expect(res).toEqual({
      message: 'Payment settings updated',
      savedCardsCheckoutEnabled: true,
    });
    expect(user.savedCardsCheckoutEnabled).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });
});
