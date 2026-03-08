import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { order_id?: string; payment_status?: string; payment_method?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { order_id, payment_status, payment_method } = body
  if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  const update: Record<string, string | null> = {}
  if (payment_status && ['unpaid', 'paid'].includes(payment_status)) {
    update.payment_status = payment_status
  }
  if (payment_method !== undefined) {
    if (payment_method === null || ['cash', 'wallet'].includes(payment_method as string)) {
      update.payment_method = payment_method as string | null
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', order_id)

  if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })

  return NextResponse.json({ success: true })
}
