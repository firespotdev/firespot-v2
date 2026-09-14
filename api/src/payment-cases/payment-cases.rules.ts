export function requiresRefundApproval(
  cumulativeExposureKobo: number,
  thresholdKobo: number,
): boolean {
  return cumulativeExposureKobo >= thresholdKobo;
}

export function adminCanAcceptDispute(
  adminAcceptanceAvailableAt: Date | undefined,
  now = new Date(),
): boolean {
  return Boolean(
    adminAcceptanceAvailableAt &&
    adminAcceptanceAvailableAt.getTime() <= now.getTime(),
  );
}
