'use client'

import { createClient } from '@/lib/supabase/client'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { OrderWithItems, OrderStatus, PaymentStatus, PaymentMethod, UserRole, OrderItemWithMenu } from '@/lib/types'
import { useState } from 'react'

const STATUS_FLOW: OrderStatus[] = ['pending', 'completed']
const EXTRA_SHOT_PRICE = 20

export default function AdminOrderRow({ order, userRole, onStatusChange }: { order: OrderWithItems, userRole: UserRole, onStatusChange?: () => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.payment_status || 'unpaid')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.payment_method || null)
  const [editingName, setEditingName] = useState(false)
  const [customerName, setCustomerName] = useState(
    order.customer_name || order.profiles?.full_name || order.profiles?.email || 'Customer'
  )
  const [deleted, setDeleted] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItemWithMenu[]>(order.order_items || [])
  const [orderTotal, setOrderTotal] = useState(order.total)
  const supabase = createClient()

  const nextStatus = status === 'voided' ? null : STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1] || null
  const isVoided = status === 'voided'
  const isGuest = !order.customer_id
  const isSuperAdmin = userRole === 'super_admin'

  if (deleted) return null

  const handleAdvance = async () => {
    if (!nextStatus) return
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', order.id)

    if (!error) {
      setStatus(nextStatus)
      onStatusChange?.()
    }
  }

  const handleVoid = async () => {
    if (!confirm('Void this order?')) return
    const { error } = await supabase
      .from('orders')
      .update({ status: 'voided' })
      .eq('id', order.id)
    if (!error) {
      setStatus('voided')
      onStatusChange?.()
    }
  }

  const handleDelete = async () => {
    if (!confirm('Permanently delete this order? This cannot be undone.')) return
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', order.id)
    if (!error) {
      setDeleted(true)
      onStatusChange?.()
    }
  }

  const handleSaveName = async () => {
    const trimmed = customerName.trim()
    if (!trimmed) return
    await supabase
      .from('orders')
      .update({ customer_name: trimmed })
      .eq('id', order.id)
    setEditingName(false)
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
      onStatusChange?.()
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
      onStatusChange?.()
    }
  }

  const handleToggleExtraShot = async (item: OrderItemWithMenu) => {
    const newExtraShot = !item.extra_shot
    const newAddOnPrice = newExtraShot ? EXTRA_SHOT_PRICE : 0
    const priceDiff = (newExtraShot ? EXTRA_SHOT_PRICE : -EXTRA_SHOT_PRICE) * item.quantity
    const newTotal = orderTotal + priceDiff

    // Update order_item
    const { error: itemError } = await supabase
      .from('order_items')
      .update({ extra_shot: newExtraShot, add_on_price: newAddOnPrice })
      .eq('id', item.id)

    if (itemError) return

    // Update order total
    const { error: orderError } = await supabase
      .from('orders')
      .update({ total: newTotal })
      .eq('id', order.id)

    if (orderError) return

    // Update local state
    setOrderItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, extra_shot: newExtraShot, add_on_price: newAddOnPrice } : i
    ))
    setOrderTotal(newTotal)
    onStatusChange?.()
  }

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border-l-2 ${
  isVoided ? 'opacity-60 border-l-transparent' :
  status === 'pending' ? 'border-l-brand-brown' :
  status === 'completed' ? 'border-l-gray-200' : 'border-l-transparent'
}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {status === 'pending' && (
            <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold shrink-0 ${order.queue_number ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-400'}`}>
              {order.queue_number ? `#${order.queue_number}` : '—'}
            </div>
          )}
          <div>
            {isSuperAdmin && !isVoided && editingName ? (
              <div className="flex items-center gap-1">
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="text-sm border rounded px-1 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-brand-pink"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} className="text-xs text-green-600 font-medium">Save</button>
                <button onClick={() => setEditingName(false)} className="text-xs text-gray-400">Cancel</button>
              </div>
            ) : (
              <p className="text-sm font-medium text-brand-dark">
                {customerName}
                {isGuest && <span className="text-xs text-gray-400 ml-1">(Guest)</span>}
                {isSuperAdmin && !isVoided && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="ml-1 text-[10px] text-gray-400 hover:text-brand-brown"
                  >
                    edit
                  </button>
                )}
              </p>
            )}
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

      <div className="space-y-1.5 text-sm mb-3">
        {orderItems.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between text-gray-600">
              <span>
                {item.menu_items?.name}
                <span className="text-gray-400 ml-1 capitalize text-xs">({item.variant})</span>
                {item.extra_shot && <span className="text-brand-brown text-xs ml-1">+shot</span>}
                <span className="text-gray-400 ml-1">x{item.quantity}</span>
              </span>
              <span>₱{(item.price + (item.add_on_price || 0)) * item.quantity}</span>
            </div>
            {!isVoided && (
              <button
                onClick={() => handleToggleExtraShot(item)}
                className={`mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                  item.extra_shot
                    ? 'bg-brand-brown text-white hover:bg-brand-brown/80'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {item.extra_shot ? '✓ +Espresso ₱20' : '+ Espresso ₱20'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t pt-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-brand-brown">₱{orderTotal}</span>
          {!isVoided && (
            <button
              onClick={handleVoid}
              className="text-[10px] text-gray-400 hover:text-red-500 transition"
            >
              Void
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={handleDelete}
              className="text-[10px] text-red-400 hover:text-red-600 transition"
            >
              Delete
            </button>
          )}
        </div>
        {!isVoided && (
          <div className="flex items-center gap-2">
            {paymentStatus === 'unpaid' ? (
              <>
                <button
                  onClick={() => handlePayment('cash')}
                  className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-brand-dark hover:text-white transition"
                >
                  Cash
                </button>
                <button
                  onClick={() => handlePayment('wallet')}
                  className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-brand-dark hover:text-white transition"
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
          </div>
        )}
      </div>
      {!isVoided && nextStatus && (
        <button
          onClick={handleAdvance}
          className="w-full mt-2 bg-brand-dark text-white py-2 rounded-xl text-xs font-semibold hover:bg-brand-brown transition"
        >
          Mark as {ORDER_STATUS_LABELS[nextStatus]}
        </button>
      )}

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
