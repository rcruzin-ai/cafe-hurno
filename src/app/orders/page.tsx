'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import OrderCard from '@/components/OrderCard'
import type { OrderWithItems } from '@/lib/types'

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/menu')
        return
      }

      const fetchOrders = async () => {
        const { data } = await supabase
          .from('orders')
          .select('*, order_items(*, menu_items(*))')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
        setOrders((data as OrderWithItems[]) || [])
      }

      try {
        await fetchOrders()
      } finally {
        setLoading(false)
      }

      channel = supabase
        .channel('my-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `customer_id=eq.${user.id}`,
          },
          () => {
            // Re-fetch full orders (with items) on any change
            fetchOrders().catch(console.error)
          }
        )
        .subscribe()
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading orders...</div>
      </div>
    )
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-brand-dark">Your Orders</h1>
        {pendingCount > 0 && (
          <p className="text-sm text-brand-muted mt-0.5">
            <span className="text-brand-brown font-medium">{pendingCount}</span> order{pendingCount !== 1 ? 's' : ''} being prepared
          </p>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4 opacity-30">☕</div>
          <p className="font-medium text-gray-500">No orders yet</p>
          <p className="text-sm mt-1">Your order history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
