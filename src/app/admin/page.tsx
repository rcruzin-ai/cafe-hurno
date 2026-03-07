'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import AdminOrderRow from '@/components/AdminOrderRow'
import type { OrderWithItems, OrderStatus } from '@/lib/types'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '@/lib/constants'

type ViewMode = 'cards' | 'table'

const FILTERS: (OrderStatus | 'all')[] = ['all', 'pending', 'preparing', 'ready', 'completed']

export default function AdminPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [view, setView] = useState<ViewMode>('cards')
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-brand-dark">
          Orders ({orders.length})
        </h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('cards')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
              view === 'cards' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setView('table')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
              view === 'table' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500'
            }`}
          >
            Table
          </button>
        </div>
      </div>

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
      ) : view === 'cards' ? (
        <div className="space-y-3">
          {filtered.map((order) => (
            <AdminOrderRow key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <AdminTableRow key={order.id} order={order} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function AdminTableRow({ order }: { order: OrderWithItems }) {
  const customerDisplay = order.customer_name
    || order.profiles?.full_name
    || order.profiles?.email
    || 'Customer'
  const isGuest = !order.customer_id

  const itemsSummary = order.order_items
    ?.map((i) => `${i.quantity}x ${i.menu_items?.name} (${i.variant})`)
    .join(', ') || ''

  const paymentStatus = order.payment_status || 'unpaid'

  return (
    <tr className="border-b last:border-b-0 hover:bg-gray-50">
      <td className="px-3 py-2 font-bold text-brand-dark">
        {order.queue_number ? `#${order.queue_number}` : '—'}
      </td>
      <td className="px-3 py-2">
        <span className="text-brand-dark">{customerDisplay}</span>
        {isGuest && <span className="text-xs text-gray-400 ml-1">(Guest)</span>}
      </td>
      <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={itemsSummary}>
        {itemsSummary}
      </td>
      <td className="px-3 py-2 font-medium text-brand-brown">₱{order.total}</td>
      <td className="px-3 py-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PAYMENT_STATUS_COLORS[paymentStatus]}`}>
          {PAYMENT_STATUS_LABELS[paymentStatus]}
        </span>
        {order.payment_method && (
          <span className="text-xs text-gray-400 ml-1">
            ({PAYMENT_METHOD_LABELS[order.payment_method]})
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-gray-400">{timeAgo(order.created_at)}</td>
    </tr>
  )
}
