/** A link a merchant typed, made absolute so it opens outside Firespot. */
export function externalHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

type Place = { latitude: number; longitude: number } | string

const placeQuery = (place: Place) =>
  typeof place === 'string' ? place : `${place.latitude},${place.longitude}`

/** Google Maps directions to coordinates or an address. */
export function directionsHref(place: Place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(placeQuery(place))}`
}

/** A Google Maps embed of a place, or null when no embed key is set. */
export function mapEmbedSrc(place: Place) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY
  if (!key) return null
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(placeQuery(place))}&zoom=15&maptype=roadmap`
}
