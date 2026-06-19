"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";

function AuthErrorRedirector() {
  const router = useRouter();

  useEffect(() => {
    // Read the hash fragment which contains the error from Supabase Auth
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const errorDesc = params.get("error_description");
      const error = params.get("error");
      
      if (errorDesc || error) {
        // Redirect to login page with the error as query parameters
        router.replace(`/auth/login?error=${error}&error_description=${encodeURIComponent(errorDesc || "")}`);
        return;
      }
    }
    
    // If no error in hash, fallback to login
    router.replace("/auth/login?error=unknown_error");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f4ed]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-tally-500 border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Processing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#f8f4ed]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-tally-500 border-t-transparent" />
      </div>
    }>
      <AuthErrorRedirector />
    </Suspense>
  );
}
