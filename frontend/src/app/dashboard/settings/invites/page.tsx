"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

interface InvitedUser {
  id: string;
  email: string;
  created_at: string;
}

export default function InvitesPage() {
  const { isCAAdmin, isCAEmployee, isLoading: isProfileLoading, supabase } = useProfile();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [newEmail, setNewEmail] = useState("");

  // Only CAs can access this page
  if (!isProfileLoading && !isCAAdmin && !isCAEmployee) {
    router.replace("/dashboard");
    return null;
  }

  const { data: invites, isLoading: isInvitesLoading } = useQuery({
    queryKey: ["invited-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invited_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InvitedUser[];
    },
    enabled: isCAAdmin || isCAEmployee,
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase
        .from("invited_users")
        .insert([{ email }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showToast("Email invited successfully!", "success");
      setNewEmail("");
      queryClient.invalidateQueries({ queryKey: ["invited-users"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to invite email.", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invited_users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast("Invite removed successfully.", "success");
      queryClient.invalidateQueries({ queryKey: ["invited-users"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to remove invite.", "error");
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    inviteMutation.mutate(newEmail.trim());
  };

  if (isProfileLoading || isInvitesLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-tally-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Team Invites</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage the whitelist of emails allowed to sign up. Users must be on this list to access the application.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Invite New User</h2>
        <form onSubmit={handleInvite} className="flex gap-4">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter email address..."
            className="flex-1 h-11 rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
            required
          />
          <button
            type="submit"
            disabled={inviteMutation.isPending}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-tally-600 px-6 font-semibold text-white transition hover:bg-tally-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {inviteMutation.isPending ? "Inviting..." : "Invite User"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Whitelisted Emails</h2>
        </div>
        
        {invites?.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No invited users yet. Add one above!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invites?.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900">{invite.email}</span>
                  <span className="text-xs text-slate-500">
                    Invited on {new Date(invite.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(invite.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  title="Remove Invite"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
