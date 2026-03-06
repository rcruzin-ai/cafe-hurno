'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'

interface InventoryItem {
  id: string
  name: string
  unit: string
  current_stock: number
  low_stock_threshold: number
}

export default function InventoryPage() {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [restockAmount, setRestockAmount] = useState('')

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name')
    setItems(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleRestock = async (itemId: string) => {
    const amount = parseFloat(restockAmount)
    if (isNaN(amount) || amount <= 0) return

    const item = items.find((i) => i.id === itemId)
    if (!item) return

    await supabase
      .from('inventory_items')
      .update({ current_stock: item.current_stock + amount })
      .eq('id', itemId)

    await supabase.from('inventory_log').insert({
      inventory_item_id: itemId,
      change_amount: amount,
      reason: 'restock',
    })

    setRestockId(null)
    setRestockAmount('')
    fetchItems()
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock <= 0) return { color: 'text-red-600 bg-red-50', label: 'Out of stock' }
    if (item.current_stock <= item.low_stock_threshold) return { color: 'text-amber-600 bg-amber-50', label: 'Low stock' }
    return { color: 'text-green-600 bg-green-50', label: 'In stock' }
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Loading inventory...</div>

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-brand-dark">Inventory</h2>
        <Link href="/admin/inventory/recipes" className="text-xs text-brand-brown font-medium hover:underline">
          View Recipes
        </Link>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const stock = getStockStatus(item)
          return (
            <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-brand-dark">{item.name}</h3>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {item.current_stock} {item.unit} remaining
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stock.color}`}>
                    {stock.label}
                  </span>
                  <button
                    onClick={() => setRestockId(restockId === item.id ? null : item.id)}
                    className="text-xs text-brand-brown font-medium hover:underline"
                  >
                    Restock
                  </button>
                </div>
              </div>

              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.current_stock <= 0
                      ? 'bg-red-400'
                      : item.current_stock <= item.low_stock_threshold
                      ? 'bg-amber-400'
                      : 'bg-green-400'
                  }`}
                  style={{
                    width: `${Math.min(100, (item.current_stock / (item.low_stock_threshold * 5)) * 100)}%`,
                  }}
                />
              </div>

              {restockId === item.id && (
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(e.target.value)}
                    placeholder={`Amount (${item.unit})`}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => handleRestock(item.id)}
                    className="bg-brand-pink-dark text-white px-4 py-1.5 rounded-lg text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
