/** Where a spot is, in the same shape as the profile's main address. */
export interface SpotAddress {
  state?: string
  city?: string
  address?: string
  additionalDetails?: string
  insideMarket?: boolean
  market?: string
  shoppingComplex?: string
  shopNumber?: string
  landmark?: string
}

export const SPOT_ADDRESS_FIELDS = [
  'state',
  'city',
  'address',
  'additionalDetails',
  'insideMarket',
  'market',
  'shoppingComplex',
  'shopNumber',
  'landmark',
] as const satisfies ReadonlyArray<keyof SpotAddress>

const MARKET_FIELDS = [
  'market',
  'shoppingComplex',
  'shopNumber',
  'landmark',
] as const

const pick = (source: SpotAddress): SpotAddress =>
  SPOT_ADDRESS_FIELDS.reduce<SpotAddress>(
    (picked, field) => ({ ...picked, [field]: source[field] }),
    {},
  )

/**
 * Writes the given address fields onto a spot document. Turning the market
 * switch off clears the market details so stale ones never show.
 */
export function applySpotAddress(spot: object, dto: SpotAddress): void {
  const target = spot as Record<keyof SpotAddress, unknown>
  SPOT_ADDRESS_FIELDS.forEach((field) => {
    if (dto[field] !== undefined) target[field] = dto[field]
  })
  if (dto.insideMarket === false) {
    MARKET_FIELDS.forEach((field) => {
      target[field] = undefined
    })
  }
}

/** The profile main address that mirrors the merchant's main spot. */
export function mainAddressFromSpot(spot: SpotAddress): SpotAddress {
  const address = pick(spot)
  return address.insideMarket
    ? address
    : {
        ...address,
        market: undefined,
        shoppingComplex: undefined,
        shopNumber: undefined,
        landmark: undefined,
      }
}

/** A main spot's address taken from a profile saved before spots existed. */
export function spotAddressFromMain(main: SpotAddress): SpotAddress {
  return pick(main)
}

const joined = (parts: Array<string | undefined>) =>
  parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')

/**
 * The two lines customers see for a spot: street, city and state, then the
 * extra directions. Spots saved before addresses had parts keep their
 * free-text location.
 */
export function publicSpotAddress(
  spot: SpotAddress & { location?: string },
): { address: string; location: string } {
  const details = joined([
    spot.additionalDetails,
    spot.market,
    spot.shoppingComplex,
    spot.shopNumber,
    spot.landmark,
  ])
  return {
    address: joined([spot.address, spot.city, spot.state]),
    location: details || joined([spot.location]),
  }
}
