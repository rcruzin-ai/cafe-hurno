'use client'

import { createClient } from '@/lib/supabase/client'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { OrderWithItems, OrderStatus, PaymentStatus, PaymentMethod } from '@/lib/types'
import { useState } from 'react'

const STATUS_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed']

export default function AdminOrderRow({ order }: { order: OrderWithItems }) {
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.payment_status || 'unpaid')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.payment_method || null)
  const supabase = createClient()

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1] || null

  const customerDisplay = order.customer_name
    || order.profiles?.full_name
    || order.profiles?.email
    || 'Customer'
  const isGuest = !order.customer_id

  const handleAdvance = async () => {
    if (!nextStatus) return
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', order.id)

    if (!error) {
      setStatus(nextStatus)

      if (nextStatus === 'preparing') {
        fetch('/api/inventory/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.id }),
        }).catch(console.error)
      }
    }
  }

  const handlePayment = async (method: 'cash' | 'wallet') => {
    const res = await fetch('/api/orders/payment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        payment_status: 'paid',
        payment_method: method,
      }),
    })
    if (res.ok) {
      setPaymentStatus('paid')
      setPaymentMethod(method)
    }
  }

  const handleUndoPayment = async () => {
    const res = await fetch('/api/orders/payment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        payment_status: 'unpaid',
        payment_method: null,
      }),
    })
    if (res.ok) {
      setPaymentStatus('unpaid')
      setPaymentMethod(null)
    }
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {order.queue_number && (
            <span className="text-lg font-bold text-brand-dark">#{order.queue_number}</span>
          )}
          <div>
            <p className="text-sm font-medium text-brand-dark">
              {customerDisplay}
              {isGuest && <span className="text-xs text-gray-400 ml-1">(Guest)</span>}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PAYMENT_STATUS_COLORS[paymentStatus]}`}>
            {PAYMENT_STATUS_LABELS[paymentStatus]}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ORDER_STATUS_COLORS[status]}`}>
            {ORDER_STATUS_LABELS[status]}
          </span>
        </div>
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
        <div className="flex items-center gap-2">
          {paymentStatus === 'unpaid' ? (
            <>
              <button
                onClick={() => handlePayment('cash')}
                className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-green-100 transition"
              >
                Cash
              </button>
              <button
                onClick={() => handlePayment('wallet')}
                className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-100 transition"
              >
                E-Wallet
              </button>
            </>
          ) : (
            <span className="text-xs text-gray-500">
              Paid via {PAYMENT_METHOD_LABELS[paymentMethod || 'cash']}
              <button onClick={handleUndoPayment} className="ml-1 text-red-400 underline">undo</button>
            </span>
          )}
          {nextStatus && (
            <button
              onClick={handleAdvance}
              className="bg-brand-pink-dark text-white px-4 py-1.5 rounded-full text-xs font-medium hover:bg-brand-dark transition"
            >
              Mark as {ORDER_STATUS_LABELS[nextStatus]}
            </button>
          )}
        </div>
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
