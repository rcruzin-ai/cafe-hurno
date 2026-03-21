'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useCartStore } from '@/lib/store/cart'
import type { MenuItem, DrinkVariant } from '@/lib/types'

export default function MenuCard({ item }: { item: MenuItem }) {
  const [variant, setVariant] = useState<DrinkVariant>(item.hot_available ? 'hot' : 'cold')
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(item, variant)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100/60">
      {/* Image */}
      <div className="relative h-36 bg-white">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-contain p-2" />
        ) : (
          <div className="flex items-center justify-center h-full text-3xl text-white/20">&#9749;</div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm text-brand-dark leading-snug">{item.name}</h3>
        {item.description && (
          <p className="text-[11px] text-brand-muted mt-0.5 line-clamp-1">{item.description}</p>
        )}

        {/* Variant pills */}
        <div className="flex gap-1 mt-2">
          {(['hot', 'cold'] as DrinkVariant[]).map((v) => {
            const disabled = v === 'hot' && !item.hot_available
            return (
              <button
                key={v}
                onClick={() => !disabled && setVariant(v)}
                disabled={disabled}
                className={`flex-1 text-[10px] py-1 rounded-full font-medium transition capitalize ${
                  disabled
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : variant === v
                    ? 'bg-brand-dark text-white'
                    : 'bg-gray-100 text-brand-muted hover:bg-gray-200'
                }`}
              >
                {v} · {v === 'hot' ? item.hot_size_oz : item.cold_size_oz}oz
              </button>
            )
          })}
        </div>

        {/* Price + Add */}
        <div className="flex items-center justify-between mt-2.5">
          <span className="font-bold text-sm text-brand-brown">₱{item.price}</span>
          <button
            onClick={handleAdd}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition text-base font-bold shadow-sm ${
              added
                ? 'bg-brand-brown text-white scale-95'
                : 'bg-brand-pink-dark/10 text-brand-brown hover:bg-brand-pink-dark hover:text-white'
            }`}
          >
            {added ? '✓' : '+'}
          </button>
        </div>
      </div>
    </div>
  )
}
