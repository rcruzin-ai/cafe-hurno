'use client'

import { createClient } from '@/lib/supabase/client'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/constants'
import type { OrderWithItems, OrderStatus } from '@/lib/types'
import { useState } from 'react'

const STATUS_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed']

export default function AdminOrderRow({ order }: { order: OrderWithItems }) {
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const supabase = createClient()

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1] || null

  const handleAdvance = async () => {
    if (!nextStatus) return
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', order.id)

    if (!error) setStatus(nextStatus)
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-brand-dark">
            {order.profiles?.full_name || order.profiles?.email || 'Customer'}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${ORDER_STATUS_COLORS[status]}`}>
          {ORDER_STATUS_LABELS[status]}
        </span>
      </div>

      <div className="space-y-1 text-sm mb-3">
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex justify-between text-gray-600">
            <span>
              {item.menu_items?.name}
              <span className="text-gray-400 ml-1 capitalize text-xs">({item.variant})</span>
              <span className="text-gray-400 ml-1">x{item.quantity}</span>
            </span>
            <span>₱{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t pt-2">
        <span className="font-bold text-brand-brown">₱{order.total}</span>
        {nextStatus && (
          <button
            onClick={handleAdvance}
            className="bg-brand-accent text-white px-4 py-1.5 rounded-full text-xs font-medium hover:bg-brand-brown transition"
          >
            Mark as {ORDER_STATUS_LABELS[nextStatus]}
          </button>
        )}
      </div>

      {order.feedback && order.feedback.length > 0 && (
        <div className="mt-3 border-t pt-2">
          {order.feedback.map((fb) => (
            <div key={fb.id} className="text-xs text-gray-500">
              <span className="text-yellow-400">{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>
              {fb.comment && <span className="ml-2">{fb.comment}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
