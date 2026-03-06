'use client'

import { useCartStore } from '@/lib/store/cart'
import type { CartItem } from '@/lib/types'

export default function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-brand-hero flex items-center justify-center text-lg">
        ☕
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-brand-dark truncate">{item.menuItem.name}</p>
        <p className="text-xs text-gray-500 capitalize">
          {item.variant} &middot; {item.variant === 'hot' ? item.menuItem.hot_size_oz : item.menuItem.cold_size_oz}oz
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(item.menuItem.id, item.variant, item.quantity - 1)}
          className="w-7 h-7 rounded-full bg-gray-100 text-sm font-bold"
        >
          -
        </button>
        <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.menuItem.id, item.variant, item.quantity + 1)}
          className="w-7 h-7 rounded-full bg-gray-100 text-sm font-bold"
        >
          +
        </button>
      </div>
      <span className="text-sm font-bold text-brand-brown w-12 text-right">
        ₱{item.menuItem.price * item.quantity}
      </span>
    </div>
  )
}
