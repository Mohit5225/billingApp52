import { signInWithGoogle } from "@/app/auth/login/actions";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f8f4ed_0%,#eef7f0_100%)] px-6 py-10 text-slate-900">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/70 px-4 py-2 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tally-400 font-bold text-tally-900">
              B
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BillingApp</p>
              <p className="text-sm font-medium text-slate-700">Modern billing workspace</p>
            </div>
          </div>

          <div className="max-w-xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Billing software that feels calm, not crowded.
            </h1>
            <p className="text-base leading-7 text-slate-600">
              Manage invoices, ledgers, compliance, and reports from one responsive workspace designed for both quick phone checks and full desktop accounting sessions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[26px] border border-white/70 bg-white/72 p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Fast daily work</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Create vouchers, browse books, and move between firms without visual clutter.
              </p>
            </div>
            <div className="rounded-[26px] border border-white/70 bg-white/72 p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Mobile-ready layout</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Cleaner spacing and stronger hierarchy help every screen hold up on small devices.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-white/75 bg-white/82 p-7 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-9">
          <div className="space-y-4 text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-tally-700">Welcome back</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              Sign in to continue to your workspace
            </h2>
            <p className="text-sm leading-6 text-slate-500">
              Use your Google account to access firms, ledgers, and ongoing billing activity.
            </p>
          </div>

          <form action={signInWithGoogle} className="mt-8">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-[24px] bg-slate-950 px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:bg-slate-900"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm font-medium text-slate-700">Secure access for merchants and CA teams.</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              By signing in, you agree to the platform terms and privacy policy.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
