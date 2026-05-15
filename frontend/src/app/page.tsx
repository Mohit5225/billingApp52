import { createClient } from '@/supabaseConfig/server'
import { redirect } from 'next/navigation'
import SignOutButton from './components/SignOutButton'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  if (!user || !session) {
    return redirect('/auth/login')
  }

  // Check if user has completed onboarding by checking their profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // If no profile, they haven't completed onboarding
    // For now, let's always redirect them if they just signed in and don't have a profile.
    // We will handle the profile creation in the backend /firms POST route later or via trigger.
    // Actually, to make the flow work seamlessly right now, we can just redirect them.
    return redirect('/onboarding/start');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#020617] text-slate-100 p-6">
      <div className="flex flex-col items-center text-center space-y-8">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Dashboard
        </h1>
        <p className="text-slate-400 text-sm font-medium">
          Welcome to your new workspace.
        </p>
        <div className="pt-8">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}

