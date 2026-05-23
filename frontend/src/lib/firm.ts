import { Profile } from "@/interfaces/profile";

export function resolveActiveFirmId(params: {
  profile: Profile | null;
  isCA: boolean;
  urlFirmId: string | null;
}) {
  const { profile, isCA, urlFirmId } = params;
  return isCA && urlFirmId ? urlFirmId : profile?.firm_id ?? null;
}
