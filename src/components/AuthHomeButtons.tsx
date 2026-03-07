'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function AuthHomeButtons() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
  }, [supabase])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/menu` },
    })
  }

  if (loading) {
    return <div className="h-12" />
  }

  if (user) {
    return (
      <button
        onClick={() => router.push('/menu')}
        className="max-w-[220px] w-full bg-brand-pink text-brand-dark py-3 rounded-full text-sm font-semibold hover:bg-brand-pink-dark transition"
      >
        Start Ordering
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => router.push('/menu')}
        className="max-w-[220px] w-full bg-brand-pink text-brand-dark py-3 rounded-full text-sm font-semibold hover:bg-brand-pink-dark transition"
      >
        Start Ordering
      </button>
      <button
        onClick={handleLogin}
        className="text-white/70 text-xs underline hover:text-white transition"
      >
        Or sign in with Google
      </button>
    </div>
  )
}
