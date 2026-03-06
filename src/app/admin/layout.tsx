import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/lib/types'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/menu')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if ((profile as Profile)?.role !== 'admin') redirect('/menu')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-dark text-white px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold">Cafe Hurno Admin</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/admin" className="hover:text-brand-pink">Orders</Link>
          <Link href="/admin/qr" className="hover:text-brand-pink">QR Code</Link>
          <Link href="/profile" className="hover:text-brand-pink">Profile</Link>
        </div>
      </header>
      <div className="max-w-2xl mx-auto">{children}</div>
    </div>
  )
}
