'use client'

import Image from 'next/image'
import { useCartStore, EXTRA_SHOT_PRICE } from '@/lib/store/cart'
import type { CartItem } from '@/lib/types'

const NON_COFFEE_NAMES = ['strawberry milk', 'ube milk']

function isCoffeeBased(name: string) {
  return !NON_COFFEE_NAMES.includes(name.toLowerCase())
}

export default function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const toggleExtraShot = useCartStore((s) => s.toggleExtraShot)

  const unitPrice = item.menuItem.price + (item.extraShot ? EXTRA_SHOT_PRICE : 0)
  const showExtraShot = isCoffeeBased(item.menuItem.name)

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100/60">
      <div className="flex items-center gap-3">
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
          <p className="text-sm font-bold text-brand-brown mt-0.5">₱{unitPrice * item.quantity}</p>
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

      {showExtraShot && (
        <button
          onClick={() => toggleExtraShot(item.menuItem.id, item.variant)}
          className={`mt-2 w-full text-[11px] py-1.5 rounded-lg font-medium transition ${
            item.extraShot
              ? 'bg-brand-brown text-white'
              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:border-brand-brown hover:text-brand-brown'
          }`}
        >
          {item.extraShot ? '✓ Extra Espresso Shot (+₱20)' : '+ Extra Espresso Shot (+₱20)'}
        </button>
      )}
    </div>
  )
}
