'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import AdminOrderRow from '@/components/AdminOrderRow'
import type { OrderWithItems, OrderStatus } from '@/lib/types'
import { ORDER_STATUS_LABELS } from '@/lib/constants'

const FILTERS: (OrderStatus | 'all')[] = ['all', 'pending', 'preparing', 'ready', 'completed']

export default function AdminPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(*)), profiles(*), feedback(*)')
        .order('created_at', { ascending: false })

      setOrders((data as OrderWithItems[]) || [])
      setLoading(false)
    }
    fetchOrders()

    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async () => {
          const { data } = await supabase
            .from('orders')
            .select('*, order_items(*, menu_items(*)), profiles(*), feedback(*)')
            .order('created_at', { ascending: false })
          setOrders((data as OrderWithItems[]) || [])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  if (loading) return <div className="p-6 text-center text-gray-400">Loading orders...</div>

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-brand-dark mb-4">
        Orders ({orders.length})
      </h2>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
              filter === f
                ? 'bg-brand-brown text-white'
                : 'bg-white text-gray-600 border'
            }`}
          >
            {f === 'all' ? 'All' : ORDER_STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">No orders</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <AdminOrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
