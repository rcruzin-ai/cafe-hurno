import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('queue_counter')
    .update({ current_number: 0 })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: 'Failed to reset' }, { status: 500 })

  // Also clear queue_number on all pending orders so they don't show stale numbers
  await supabase
    .from('orders')
    .update({ queue_number: null })
    .eq('status', 'pending')

  return NextResponse.json({ success: true, message: 'Queue reset to 0' })
}
