/**
 * Resolve which firm is currently active.
 *
 * Priority (highest → lowest):
 *  1. urlFirmId  – explicit URL param; always reflects user intent.
 *  2. profileFirmId – the firm attached to the logged-in profile.
 *                     Safe for merchants (they own exactly one firm).
 *
 * sessionStorage is intentionally NOT used as a fallback because it
 * causes stale firm IDs to persist when navigating to a URL that has
 * no ?firm_id= param.
 */
export function resolveActiveFirmId(params: {
  urlFirmId: string | null;
  profileFirmId?: string | null;
}): string | null {
  return params.urlFirmId ?? params.profileFirmId ?? null;
}
