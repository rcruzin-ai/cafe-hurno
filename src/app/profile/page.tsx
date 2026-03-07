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
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="font-semibold text-brand-dark mb-1">Sign in to your account</h2>
        <p className="text-sm text-gray-400 mb-6">Track orders and save your preferences</p>
        <button onClick={handleLogin} className="bg-brand-dark text-white px-8 py-3 rounded-xl text-sm font-semibold w-full hover:bg-brand-brown transition">
          Sign in with Google
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-dark mb-5">Account</h1>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/60">
        {/* Avatar */}
        <div className="flex flex-col items-center text-center mb-5">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.full_name || ''} width={72} height={72} className="rounded-full mb-3" />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-brand-dark flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-white">{(profile.full_name || profile.email || '?')[0].toUpperCase()}</span>
            </div>
          )}
          <h2 className="text-lg font-bold text-brand-dark">{profile.full_name}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{profile.email}</p>
          <span className="mt-2 inline-block text-[11px] bg-brand-dark/5 text-brand-brown px-3 py-0.5 rounded-full capitalize font-medium">
            {profile.role.replace('_', ' ')}
          </span>
        </div>

        {/* Admin CTA */}
        {(profile.role === 'admin' || profile.role === 'super_admin') && (
          <button
            onClick={() => router.push('/admin')}
            className="w-full bg-brand-dark text-white py-3 rounded-xl text-sm font-semibold hover:bg-brand-brown transition mb-2"
          >
            Manage Orders
          </button>
        )}

        <button
          onClick={handleLogout}
          className="w-full border border-gray-200 text-gray-500 py-3 rounded-xl text-sm hover:bg-gray-50 transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
