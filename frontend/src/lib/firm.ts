import { Profile } from "@/interfaces/profile";

export function resolveActiveFirmId(params: {
  profile: Profile | null;
  urlFirmId: string | null;
  storedFirmId?: string | null;
}) {
  const { profile, urlFirmId, storedFirmId } = params;
  return urlFirmId ?? storedFirmId ?? profile?.firm_id ?? null;
}
