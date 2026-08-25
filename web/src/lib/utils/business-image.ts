export interface BusinessImageSource {
  businessImageUrl?: string
  profilePhotoUrl?: string
}

/**
 * Existing merchants stored their business image in profilePhotoUrl before
 * business and personal identity images were separated. Keep that image
 * visible until they upload a dedicated business image.
 */
export function getBusinessImageUrl(
  source?: BusinessImageSource | null,
): string | undefined {
  return source?.businessImageUrl || source?.profilePhotoUrl
}
