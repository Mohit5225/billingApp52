import GoogleSignInButton from "@/app/auth/login/GoogleSignInButton";

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

          <div className="mt-8">
            <GoogleSignInButton />
          </div>

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
