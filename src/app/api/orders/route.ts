import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const EXTRA_SHOT_PRICE = 20

interface OrderItemInput {
  menu_item_id: string
  variant: 'hot' | 'cold'
  quantity: number
  extra_shot?: boolean
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let items: OrderItemInput[]
  let customerName: string | null = null

  try {
    const body = await request.json() as {
      items?: OrderItemInput[]
      customer_name?: string
    }
    items = body.items ?? []
    customerName = body.customer_name?.trim() || null
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Must be logged in OR provide a guest name
  if (!user && !customerName) {
    return NextResponse.json({ error: 'Sign in or provide your name to order' }, { status: 401 })
  }

  // Rate limit: by user ID if logged in, by IP if guest
  const rateLimitKey = user
    ? `orders:${user.id}`
    : `orders:guest:${request.headers.get('x-forwarded-for') || 'unknown'}`
  const { allowed } = checkRateLimit(rateLimitKey, 10, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 })
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
      return NextResponse.json({ error: 'Quantity must be 1-20' }, { status: 400 })
    }
  }

  // Fetch real prices from DB
  const menuItemIds = Array.from(new Set(items.map(i => i.menu_item_id)))
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, price, available')
    .in('id', menuItemIds)

  if (menuError || !menuItems) {
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 })
  }

  for (const item of items) {
    const menuItem = menuItems.find(m => m.id === item.menu_item_id)
    if (!menuItem) return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    if (!menuItem.available) return NextResponse.json({ error: 'Item is unavailable' }, { status: 400 })
  }

  const priceMap = Object.fromEntries(menuItems.map(m => [m.id, m.price]))
  const total = items.reduce((sum, item) => {
    const addOn = item.extra_shot ? EXTRA_SHOT_PRICE : 0
    return sum + (priceMap[item.menu_item_id] + addOn) * item.quantity
  }, 0)

  // Get next queue number (atomic)
  const { data: queueData, error: queueError } = await supabase.rpc('next_queue_number')
  if (queueError) {
    return NextResponse.json({ error: 'Failed to assign queue number' }, { status: 500 })
  }
  const queueNumber = queueData as number

  let orderId: string

  if (user) {
    // Logged-in user order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        customer_name: customerName,
        total,
        status: 'pending',
        queue_number: queueNumber,
        payment_status: 'unpaid',
      })
      .select('id')
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }
    orderId = order.id

    const orderItems = items.map(item => ({
      order_id: orderId,
      menu_item_id: item.menu_item_id,
      variant: item.variant,
      quantity: item.quantity,
      price: priceMap[item.menu_item_id],
      extra_shot: item.extra_shot || false,
      add_on_price: item.extra_shot ? EXTRA_SHOT_PRICE : 0,
    }))
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) {
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }
  } else {
    // Guest order — use security definer RPCs
    const { data: guestOrderId, error: guestError } = await supabase.rpc('create_guest_order', {
      p_customer_name: customerName,
      p_total: total,
      p_queue_number: queueNumber,
    })

    if (guestError || !guestOrderId) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }
    orderId = guestOrderId as string

    const itemsPayload = items.map(item => ({
      order_id: orderId,
      menu_item_id: item.menu_item_id,
      variant: item.variant,
      quantity: item.quantity,
      price: priceMap[item.menu_item_id],
      extra_shot: item.extra_shot || false,
      add_on_price: item.extra_shot ? EXTRA_SHOT_PRICE : 0,
    }))
    const { error: itemsError } = await supabase.rpc('create_guest_order_items', {
      p_items: itemsPayload,
    })
    if (itemsError) {
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }
  }

  return NextResponse.json({ order_id: orderId, queue_number: queueNumber })
}
