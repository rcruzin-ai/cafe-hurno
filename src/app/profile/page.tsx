'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { Profile } from '@/lib/types'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data as Profile)
      setLoading(false)
    }
    fetchProfile()
  }, [supabase])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/profile` },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Loading...</div>

  if (!profile) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-4xl mb-4">👤</p>
        <p className="text-gray-500 mb-4">Sign in to view your profile</p>
        <button onClick={handleLogin} className="bg-brand-dark text-white px-6 py-2 rounded-full text-sm font-medium">
          Sign in with Google
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="bg-white rounded-xl p-6 shadow-sm text-center">
        {profile.avatar_url && (
          <Image
            src={profile.avatar_url}
            alt={profile.full_name || ''}
            width={80}
            height={80}
            className="rounded-full mx-auto mb-3"
          />
        )}
        <h2 className="font-bold text-brand-dark">{profile.full_name}</h2>
        <p className="text-sm text-gray-500">{profile.email}</p>
        <span className="inline-block mt-2 text-xs bg-brand-light text-brand-brown px-3 py-1 rounded-full capitalize">
          {profile.role}
        </span>

        {profile.role === 'admin' && (
          <button
            onClick={() => router.push('/admin')}
            className="mt-4 w-full bg-brand-pink-dark text-white py-2 rounded-full text-sm font-medium"
          >
            Admin Dashboard
          </button>
        )}

        <button
          onClick={handleLogout}
          className="mt-3 w-full border border-gray-200 text-gray-500 py-2 rounded-full text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
