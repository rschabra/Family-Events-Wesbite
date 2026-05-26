import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AccessCode, Profile } from '@/lib/types'
import ProfileForm from './profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: groupRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
    supabase
      .from('profile_access_codes')
      .select('access_codes(id, code, name, is_active, created_at)')
      .eq('profile_id', user.id),
  ])

  if (!profile) {
    return (
      <main className="flex-1 p-6 max-w-md mx-auto">
        <p className="text-sm text-gray-600">Profile not found. Try logging out and back in.</p>
      </main>
    )
  }

  const groups = (groupRows ?? [])
    .map((r) => r.access_codes)
    .filter(Boolean) as unknown as AccessCode[]

  return (
    <main className="flex-1 p-6 max-w-md mx-auto w-full space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Your profile</h1>
      <ProfileForm profile={profile} email={user.email ?? ''} initialGroups={groups} />
    </main>
  )
}
