// Profile page. Server component loads the profile, then hands it to a
// client form for editing.
import { redirect } from 'next/navigation'
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
      <h1 className="text-xl font-semibold text-gray-900">Your profile</h1>
      <ProfileForm profile={profile} email={user.email ?? ''} />
    </main>
  )
}
