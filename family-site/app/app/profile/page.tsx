// Profile page. Server component loads the profile, then hands it to a
// client form for editing.
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import ProfileForm from './profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile) {
    return (
      <main className="flex-1 p-6 max-w-md mx-auto">
        <p className="text-sm text-gray-600">
          Profile not found. Try logging out and back in.
        </p>
      </main>
    )
  }

  return (
    <main className="flex-1 p-6 max-w-md mx-auto w-full space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <Link href="/dashboard" className="text-sm text-gray-500 underline">
          Back
        </Link>
      </header>
      <ProfileForm profile={profile} email={user.email ?? ''} />
    </main>
  )
}
