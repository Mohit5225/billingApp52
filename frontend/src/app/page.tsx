import { createClient } from '@/supabaseConfig/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // On the server, `getUser()` is the reliable auth check.
  // `getSession()` can be temporarily unavailable during redirect/cookie refresh flows.
  if (!user) {
    return redirect('/auth/login')
  }

  // Fetch the user's profile to determine their role and onboarding status
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // If no profile exists, they haven't completed onboarding.
    return redirect('/onboarding/start');
  }

  // Step 3: Intelligent Routing based on Role
  if (profile.role === 'merchant') {
    return redirect('/dashboard');
  } else if (profile.role === 'ca_admin' || profile.role === 'ca_employee') {
    return redirect('/firms');
  }

  // Fallback in case of an unknown role
  return redirect('/dashboard');
}
