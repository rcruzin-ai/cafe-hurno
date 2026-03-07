import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/lib/types'
import Link from 'next/link'
import Image from 'next/image'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/menu')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = (profile as Profile)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect('/menu')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-dark text-white px-4 py-2 flex items-center justify-between">
        <Link href="/admin">
          <Image src="/images/logo.png" alt="Cafe Hurno" width={36} height={36} className="rounded-full" />
        </Link>
        <div className="flex gap-3 text-xs">
          <Link href="/admin" className="hover:text-brand-pink">Orders</Link>
          <Link href="/admin/inventory" className="hover:text-brand-pink">Inventory</Link>
          <Link href="/admin/qr" className="hover:text-brand-pink">QR</Link>
          <Link href="/pay" className="hover:text-brand-pink">E-Wallet</Link>
          <Link href="/profile" className="hover:text-brand-pink">Profile</Link>
        </div>
      </header>
      <div className="max-w-2xl mx-auto">{children}</div>
    </div>
  )
}
