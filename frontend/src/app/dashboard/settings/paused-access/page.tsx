"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/context/ProfileContext";
import { useFirmScope } from "@/app/dashboard/shared/useFirmScope";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/http";

interface FirmUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_paused: boolean;
}

export default function PausedAccessPage() {
  const { isCAAdmin, isCAEmployee, isLoading: isProfileLoading, supabase, profile } = useProfile();
  const { activeFirmId } = useFirmScope();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Only CAs can access this page
  if (!isProfileLoading && !isCAAdmin && !isCAEmployee) {
    router.replace("/dashboard");
    return null;
  }

  const { data: users, isLoading } = useQuery({
    queryKey: ["firm-users-access", activeFirmId],
    queryFn: async () => {
      if (!activeFirmId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("firm_id", activeFirmId)
        .neq("role", "ca_admin")
        .neq("role", "ca_employee")
        .order("is_paused", { ascending: false }) // Show paused ones first
        .order("full_name");

      if (error) throw error;
      return data as FirmUser[];
    },
    enabled: (isCAAdmin || isCAEmployee) && !!activeFirmId,
  });

  const togglePauseMutation = useMutation({
    mutationFn: async ({ id, isPaused }: { id: string; isPaused: boolean }) => {
      return apiRequest(supabase, `/api/profiles/${id}/toggle-pause`, {
        method: "PUT",
        body: { is_paused: isPaused }
      });
    },
    onSuccess: () => {
      showToast("User access updated successfully.", "success");
      queryClient.invalidateQueries({ queryKey: ["firm-users-access"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update user access.", "error");
    },
  });

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-tally-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Paused Access</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage user access to the firm. Paused users will be completely blocked from interacting with the app.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">User Access Management</h2>
        </div>
        
        {users?.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No users found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users?.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900">{user.full_name}</span>
                  <span className="text-sm text-slate-500">{user.email}</span>
                  <span className="text-xs font-medium text-tally-600 uppercase mt-0.5">{user.role}</span>
                </div>
                <div className="flex items-center gap-4">
                  {user.is_paused ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                      Paused
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Active
                    </span>
                  )}
                  {isCAAdmin && user.id !== profile?.id && (
                    <button
                      onClick={() => togglePauseMutation.mutate({ id: user.id, isPaused: !user.is_paused })}
                      disabled={togglePauseMutation.isPending}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        user.is_paused 
                          ? "bg-green-50 text-green-700 hover:bg-green-100" 
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                      } disabled:opacity-50`}
                    >
                      {user.is_paused ? "Restore Access" : "Pause Access"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
