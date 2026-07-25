/**
 * Normalizes a phone number to the digits-only form stored on User.phoneNumber.
 * For Nigerian numbers (+234) a leading 0 is stripped so local (0803...) and
 * international (803...) inputs collapse to the same identity.
 *
 * This is the single source of truth shared by auth (OTP find-or-create) and
 * account-linking (merchant-created placeholders), so both resolve the same
 * account for a given number.
 */
export function normalizeNigerianPhone(
  phone: string,
  countryCode = "+234",
): string {
  let cleaned = (phone || "").replace(/\D/g, "");
  const callingCode = (countryCode || "").replace(/\D/g, "");

  if (callingCode && cleaned.startsWith(callingCode)) {
    cleaned = cleaned.slice(callingCode.length);
  }
  if (countryCode === "+234" && cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}
