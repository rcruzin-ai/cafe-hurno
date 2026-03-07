'use client'

import Image from 'next/image'
import { useCartStore } from '@/lib/store/cart'
import type { CartItem } from '@/lib/types'

export default function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100/60">
      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-brand-dark shrink-0">
        {item.menuItem.image_url ? (
          <Image src={item.menuItem.image_url} alt={item.menuItem.name} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-lg text-white/20">&#9749;</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-brand-dark truncate">{item.menuItem.name}</h3>
        <p className="text-[11px] text-brand-muted capitalize">{item.variant} · {item.variant === 'hot' ? item.menuItem.hot_size_oz : item.menuItem.cold_size_oz}oz</p>
        <p className="text-sm font-bold text-brand-brown mt-0.5">₱{item.menuItem.price * item.quantity}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => updateQuantity(item.menuItem.id, item.variant, item.quantity - 1)}
          className="w-7 h-7 rounded-full bg-gray-100 text-brand-dark font-bold flex items-center justify-center hover:bg-gray-200 transition text-base leading-none"
        >−</button>
        <span className="text-sm font-semibold text-brand-dark w-5 text-center">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.menuItem.id, item.variant, item.quantity + 1)}
          className="w-7 h-7 rounded-full bg-brand-dark text-white font-bold flex items-center justify-center hover:bg-brand-brown transition text-base leading-none"
        >+</button>
      </div>
    </div>
  )
}
