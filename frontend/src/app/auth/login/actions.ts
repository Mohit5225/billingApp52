'use server'

import { createClient } from '@/supabaseConfig/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })

  if (error) {
    console.error('Auth error:', error.message)
    return redirect('/auth/login?error=' + encodeURIComponent(error.message))
  }

  if (data.url) {
    redirect(data.url) // use the redirect from next/navigation
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
