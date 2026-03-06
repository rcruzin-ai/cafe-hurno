'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import type { MenuItem, DrinkVariant } from '@/lib/types'

export default function MenuCard({ item }: { item: MenuItem }) {
  const [variant, setVariant] = useState<DrinkVariant>('hot')
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(item, variant)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="relative h-40 bg-brand-hero">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl">☕</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-brand-dark">{item.name}</h3>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>

        {/* Variant toggle */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setVariant('hot')}
            className={`flex-1 text-xs py-1.5 rounded-full font-medium transition ${
              variant === 'hot'
                ? 'bg-brand-brown text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Hot ({item.hot_size_oz}oz)
          </button>
          <button
            onClick={() => setVariant('cold')}
            className={`flex-1 text-xs py-1.5 rounded-full font-medium transition ${
              variant === 'cold'
                ? 'bg-brand-brown text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Cold ({item.cold_size_oz}oz)
          </button>
        </div>

        {/* Price & Add */}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-brand-brown">₱{item.price}</span>
          <button
            onClick={handleAdd}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
              added
                ? 'bg-green-500 text-white'
                : 'bg-brand-accent text-white hover:bg-brand-brown'
            }`}
          >
            {added ? 'Added!' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
