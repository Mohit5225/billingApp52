import { createClient } from '@/supabaseConfig/server'
import { redirect } from 'next/navigation'
import { signOut } from './auth/login/actions'

async function getBackendStatus(token: string) {
  try {
    const res = await fetch('http://127.0.0.1:8000/api/status', {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    return null;
  }
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  if (!user || !session) {
    return redirect('/login')
  }

  const status = await getBackendStatus(session.access_token);
  const isConnected = status?.status === 'connected';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#020617] text-slate-100 p-6 selection:bg-emerald-500/30">
      <div className="relative group w-full max-w-lg">
        {/* Decorative background glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

        <div className="relative flex flex-col items-center text-center p-10 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-8">

          {/* User Profile Section */}
          <div className="flex items-center gap-4 p-3 rounded-full bg-slate-950/50 border border-slate-800/50 pr-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 overflow-hidden">
              {user.user_metadata.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-400 font-bold">
                  {user.email?.[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-200">{user.user_metadata.full_name || 'User'}</p>
              <p className="text-[10px] text-slate-500 font-mono">{user.email}</p>
            </div>
            <form action={signOut} className="ml-2">
              <button className="p-2 text-slate-500 hover:text-rose-400 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </form>
          </div>

          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} transition-colors duration-500`}>
            {isConnected ? (
              <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight">
              System <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Connectivity</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">
              {isConnected ? 'Backend Link Active' : 'Waiting for Backend...'}
            </p>
          </div>

          <div className="w-full space-y-4 pt-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Frontend Status</span>
              <span className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Operational
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Backend Status</span>
              <span className={`flex items-center gap-2 text-sm font-bold ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Connected to {status.server}
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Offline
                  </>
                )}
              </span>
            </div>
          </div>

          {isConnected && (
            <div className="text-slate-500 text-[10px] font-mono opacity-50">
              Last Ping: {status.timestamp}
            </div>
          )}

          <button className="px-8 py-3 bg-slate-100 text-slate-950 font-bold rounded-full hover:bg-white transition-all transform hover:scale-105 active:scale-95 shadow-lg">
            Refresh Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}

