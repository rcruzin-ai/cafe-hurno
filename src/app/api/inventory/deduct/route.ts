import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { allowed } = checkRateLimit(`inventory:${user.id}`, 30, 60_000) // 30/minute for admin
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  let order_id: string
  try {
    const body = await request.json() as { order_id?: string }
    order_id = body.order_id ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  // Prevent double-deduction
  const { data: existingLog } = await supabase
    .from('inventory_log')
    .select('id')
    .eq('reference_id', order_id)
    .eq('reason', 'order_deduction')
    .limit(1)
  if (existingLog && existingLog.length > 0) {
    return NextResponse.json({ message: 'Already deducted' })
  }

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('menu_item_id, variant, quantity')
    .eq('order_id', order_id)

  if (!orderItems || orderItems.length === 0) {
    return NextResponse.json({ error: 'No order items found' }, { status: 404 })
  }

  for (const item of orderItems) {
    const { data: recipe } = await supabase
      .from('recipes')
      .select('inventory_item_id, quantity_needed')
      .eq('menu_item_id', item.menu_item_id)
      .eq('variant', item.variant)

    if (!recipe) continue

    for (const ingredient of recipe) {
      const totalDeduction = ingredient.quantity_needed * item.quantity

      const { data: invItem } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', ingredient.inventory_item_id)
        .single()

      if (invItem) {
        await supabase
          .from('inventory_items')
          .update({ current_stock: invItem.current_stock - totalDeduction })
          .eq('id', ingredient.inventory_item_id)
      }

      await supabase.from('inventory_log').insert({
        inventory_item_id: ingredient.inventory_item_id,
        change_amount: -totalDeduction,
        reason: 'order_deduction',
        reference_id: order_id,
      })
    }
  }

  return NextResponse.json({ success: true })
}
