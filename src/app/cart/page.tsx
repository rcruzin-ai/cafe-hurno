'use client'

export const dynamic = 'force-dynamic'

import { useCartStore } from '@/lib/store/cart'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import CartItemRow from '@/components/CartItemRow'
import type { User } from '@supabase/supabase-js'

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const getTotal = useCartStore((s) => s.getTotal)
  const clearCart = useCartStore((s) => s.clearCart)
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [supabase])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/cart` },
    })
  }

  const handlePlaceOrder = async () => {
    if (!user) return handleLogin()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map(item => ({
          menu_item_id: item.menuItem.id,
          variant: item.variant,
          quantity: item.quantity,
        })),
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.order_id) {
      setError(data.error || 'Failed to place order')
      setLoading(false)
      return
    }

    clearCart()
    setOrderId(data.order_id)
    setLoading(false)
  }

  if (orderId) {
    return <OrderSuccess orderId={orderId} />
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-dark mb-4">Your Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p>Your cart is empty</p>
          <button
            onClick={() => router.push('/menu')}
            className="mt-4 text-brand-brown underline text-sm"
          >
            Browse menu
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <CartItemRow
                key={`${item.menuItem.id}-${item.variant}`}
                item={item}
              />
            ))}
          </div>

          <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-lg text-brand-dark">₱{getTotal()}</span>
            </div>
            {error && (
              <p className="text-red-500 text-sm mb-3">{error}</p>
            )}
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full bg-brand-pink-dark text-white py-3 rounded-full font-semibold hover:bg-brand-dark transition disabled:opacity-50"
            >
              {loading ? 'Placing Order...' : user ? 'Place Order' : 'Sign in to Order'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function OrderSuccess({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const supabase = createClient()

  const handleFeedback = async () => {
    if (rating === 0) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('feedback').insert({
      order_id: orderId,
      customer_id: user.id,
      rating,
      comment: comment || null,
    })
    setSubmitted(true)
  }

  return (
    <div className="px-4 py-6 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-xl font-bold text-brand-dark mb-2">Order Placed!</h2>
      <p className="text-sm text-gray-500 mb-6">Your order is being prepared</p>

      {!submitted ? (
        <div className="bg-white rounded-xl p-4 shadow-sm text-left mt-6">
          <h3 className="font-semibold text-brand-dark mb-3">How was your experience?</h3>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any comments? (optional)"
            className="w-full border rounded-lg p-2 text-sm mb-3 resize-none h-20"
          />
          <button
            onClick={handleFeedback}
            disabled={rating === 0}
            className="w-full bg-brand-pink-dark text-white py-2 rounded-full text-sm font-medium disabled:opacity-50"
          >
            Submit Feedback
          </button>
        </div>
      ) : (
        <p className="text-sm text-green-600 mt-4">Thanks for your feedback!</p>
      )}

      <button
        onClick={() => router.push('/orders')}
        className="mt-6 text-brand-brown underline text-sm"
      >
        Track your order →
      </button>
    </div>
  )
}
