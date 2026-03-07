'use client'

import Image from 'next/image'
import { useState } from 'react'
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
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="relative h-36 bg-brand-dark">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl">
            <span className="text-white/30">&#9749;</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-brand-dark leading-tight">{item.name}</h3>
        <p className="text-[11px] text-brand-muted mt-0.5 line-clamp-2">{item.description}</p>

        <div className="flex gap-1.5 mt-2">
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
                    : 'bg-gray-100 text-brand-muted'
                }`}
              >
                {v} ({v === 'hot' ? item.hot_size_oz : item.cold_size_oz}oz)
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <span className="font-bold text-sm text-brand-brown">P{item.price}</span>
          <button
            onClick={handleAdd}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition text-sm font-bold ${
              added
                ? 'bg-brand-pink-dark text-white'
                : 'bg-brand-pink/20 text-brand-brown hover:bg-brand-pink-dark hover:text-white'
            }`}
          >
            {added ? '✓' : '+'}
          </button>
        </div>
      </div>
    </div>
  )
}
