'use client'

import Image from 'next/image'
import { useCartStore } from '@/lib/store/cart'
import type { CartItem } from '@/lib/types'

export default function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-brand-dark shrink-0">
        {item.menuItem.image_url ? (
          <Image
            src={item.menuItem.image_url}
            alt={item.menuItem.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xl text-white/30">&#9749;</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-brand-dark truncate">{item.menuItem.name}</h3>
        <p className="text-[11px] text-brand-muted capitalize">{item.variant} · {item.variant === 'hot' ? item.menuItem.hot_size_oz : item.menuItem.cold_size_oz}oz</p>
        <p className="text-sm font-bold text-brand-brown mt-0.5">P{item.menuItem.price * item.quantity}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(item.menuItem.id, item.variant, item.quantity - 1)}
          className="w-7 h-7 rounded-full bg-gray-100 text-brand-dark text-sm font-medium flex items-center justify-center hover:bg-gray-200 transition"
        >
          -
        </button>
        <span className="text-sm font-semibold text-brand-dark w-5 text-center">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.menuItem.id, item.variant, item.quantity + 1)}
          className="w-7 h-7 rounded-full bg-brand-pink/20 text-brand-brown text-sm font-medium flex items-center justify-center hover:bg-brand-pink-dark hover:text-white transition"
        >
          +
        </button>
      </div>
    </div>
  )
}
