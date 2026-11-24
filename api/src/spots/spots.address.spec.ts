import { Types } from 'mongoose'
import { SpotsService } from './spots.service'
import {
  applySpotAddress,
  mainAddressFromSpot,
  publicSpotAddress,
  spotAddressFromMain,
} from './spot-address'

const query = (val: unknown) => ({
  exec: jest.fn().mockResolvedValue(val),
  sort: jest.fn().mockReturnThis(),
})

describe('spot address', () => {
  it('copies the address fields it is given', () => {
    const spot: Record<string, unknown> = { name: 'Wuse' }

    applySpotAddress(spot, {
      state: 'FCT',
      city: 'Abuja Municipal',
      address: '14 Aminu Kano Crescent',
      additionalDetails: '2nd floor',
      insideMarket: true,
      market: 'Wuse Market',
      shopNumber: '32B',
    })

    expect(spot).toMatchObject({
      state: 'FCT',
      city: 'Abuja Municipal',
      address: '14 Aminu Kano Crescent',
      additionalDetails: '2nd floor',
      insideMarket: true,
      market: 'Wuse Market',
      shopNumber: '32B',
    })
  })

  it('clears the market details when the spot is not in a market', () => {
    const spot: Record<string, unknown> = {
      insideMarket: true,
      market: 'Wuse Market',
      shoppingComplex: 'Banex Plaza',
      shopNumber: '32B',
      landmark: 'Beside White House',
    }

    applySpotAddress(spot, { insideMarket: false })

    expect(spot).toMatchObject({
      insideMarket: false,
      market: undefined,
      shoppingComplex: undefined,
      shopNumber: undefined,
      landmark: undefined,
    })
  })

  it('turns a spot into the profile main address and back', () => {
    const fields = {
      state: 'Lagos',
      city: 'Ikeja',
      address: '23 Allen Avenue',
      additionalDetails: 'Suite 4',
      insideMarket: false,
    }

    expect(mainAddressFromSpot(fields)).toEqual({
      ...fields,
      market: undefined,
      shoppingComplex: undefined,
      shopNumber: undefined,
      landmark: undefined,
    })
    expect(spotAddressFromMain(fields)).toMatchObject(fields)
  })
})

describe('SpotsService main spot', () => {
  const merchantId = new Types.ObjectId().toString()

  const build = (spots: unknown[], user: Record<string, unknown> | null) => {
    const saved: Array<Record<string, unknown>> = []
    const SpotMock: any = jest.fn().mockImplementation((dto) => {
      const doc = {
        ...dto,
        save: jest.fn().mockImplementation(function (this: any) {
          saved.push(this)
          return Promise.resolve(this)
        }),
      }
      return doc
    })
    Object.assign(SpotMock, {
      find: jest.fn().mockReturnValue(query(spots)),
      findOne: jest.fn().mockReturnValue(query(null)),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(spots.length) }),
    })
    const userModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(user),
        }),
      }),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    }
    const service = new SpotsService(
      SpotMock,
      userModel as any,
      {} as any,
      { get: jest.fn() } as any,
    )
    return { service, userModel, saved }
  }

  it("turns a saved main address into the merchant's main spot", async () => {
    const { service, saved } = build([], {
      _id: merchantId,
      role: 'merchant',
      businessName: 'Lagos Leaf Café',
      mainAddress: { state: 'Lagos', city: 'Ikeja', address: '23 Allen Avenue' },
    })

    const spots = await service.findAll(merchantId)

    expect(spots).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      name: 'Lagos Leaf Café',
      state: 'Lagos',
      city: 'Ikeja',
      address: '23 Allen Avenue',
      isPrimary: true,
      isActive: true,
    })
  })

  it('lists nothing when there is no saved address', async () => {
    const { service, saved } = build([], {
      _id: merchantId,
      role: 'merchant',
      businessName: 'Lagos Leaf Café',
    })

    await expect(service.findAll(merchantId)).resolves.toEqual([])
    expect(saved).toHaveLength(0)
  })

  it('copies the first spot to the profile main address', async () => {
    const { service, userModel } = build([], {
      _id: merchantId,
      role: 'merchant',
      subscriptions: [],
    })

    await service.create(merchantId, {
      name: 'Wuse',
      state: 'FCT',
      city: 'Abuja Municipal',
      address: '14 Aminu Kano Crescent',
      idempotencyKey: '7b3c0d1e-2f4a-4b5c-8d6e-7f8091a2b3c4',
    })

    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(Types.ObjectId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          mainAddress: expect.objectContaining({
            state: 'FCT',
            address: '14 Aminu Kano Crescent',
          }),
        }),
      }),
    )
  })
})

describe('public spot address', () => {
  it('joins street, city and state, then the market details', () => {
    expect(
      publicSpotAddress({
        address: '14 Aminu Kano Crescent',
        city: 'Abuja Municipal',
        state: 'FCT',
        additionalDetails: '2nd floor',
        insideMarket: true,
        market: 'Wuse Market',
        shopNumber: '32B',
      }),
    ).toEqual({
      address: '14 Aminu Kano Crescent, Abuja Municipal, FCT',
      location: '2nd floor, Wuse Market, 32B',
    })
  })

  it('keeps the free-text location of spots saved before addresses had parts', () => {
    expect(
      publicSpotAddress({ address: '23 Allen Avenue', location: 'Ikeja, Lagos' }),
    ).toEqual({ address: '23 Allen Avenue', location: 'Ikeja, Lagos' })
  })
})
