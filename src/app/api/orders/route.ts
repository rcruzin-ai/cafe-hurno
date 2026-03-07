import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface OrderItemInput {
  menu_item_id: string
  variant: 'hot' | 'cold'
  quantity: number
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let items: OrderItemInput[]
  try {
    const body = await request.json() as { items?: OrderItemInput[] }
    items = body.items ?? []
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400 })
  }

  // Validate each item
  for (const item of items) {
    if (!item.menu_item_id || !['hot', 'cold'].includes(item.variant)) {
      return NextResponse.json({ error: 'Invalid item' }, { status: 400 })
    }
    if (typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 20) {
      return NextResponse.json({ error: 'Quantity must be 1–20' }, { status: 400 })
    }
  }

  // Fetch real prices from DB — never trust client-supplied prices
  const menuItemIds = Array.from(new Set(items.map(i => i.menu_item_id)))
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, price, available')
    .in('id', menuItemIds)

  if (menuError || !menuItems) {
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 })
  }

  // Check all items exist and are available
  for (const item of items) {
    const menuItem = menuItems.find(m => m.id === item.menu_item_id)
    if (!menuItem) return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    if (!menuItem.available) return NextResponse.json({ error: 'Item is unavailable' }, { status: 400 })
  }

  // Compute total server-side from real DB prices
  const priceMap = Object.fromEntries(menuItems.map(m => [m.id, m.price]))
  const total = items.reduce((sum, item) => sum + priceMap[item.menu_item_id] * item.quantity, 0)

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ customer_id: user.id, total, status: 'pending' })
    .select('id')
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  // Insert order items with server-verified prices
  const orderItems = items.map(item => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    variant: item.variant,
    quantity: item.quantity,
    price: priceMap[item.menu_item_id],
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) {
    return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
  }

  return NextResponse.json({ order_id: order.id })
}
