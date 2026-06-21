import { useQuery } from "@tanstack/react-query";
import { SupabaseClient } from "@supabase/supabase-js";
import { apiRequest } from "@/lib/http";

export function usePeriodBlock(
  activeFirmId: string | null,
  supabase: SupabaseClient,
  year: number | null,
  month: number | null
) {
  return useQuery({
    queryKey: ["period-blocks", activeFirmId, year, month],
    queryFn: async () => {
      if (!activeFirmId || !year || !month) return null;
      const resp = await apiRequest<any[]>(
        supabase,
        `/api/firms/${activeFirmId}/period-blocks?year=${year}`
      );
      return resp.find((b) => b.month === month) || null;
    },
    enabled: !!activeFirmId && !!year && !!month,
  });
}
