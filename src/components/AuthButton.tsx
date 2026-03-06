'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export default function AuthButton() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  if (user) {
    return (
      <button
        onClick={handleLogout}
        className="text-sm text-brand-brown underline"
      >
        Sign Out
      </button>
    )
  }

  return (
    <button
      onClick={handleLogin}
      className="bg-brand-brown text-white px-4 py-2 rounded-full text-sm font-medium"
    >
      Sign in with Google
    </button>
  )
}
