'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

interface RecipeView {
  menu_item_name: string
  variant: string
  ingredients: { name: string; quantity_needed: number; unit: string }[]
}

export default function RecipesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [recipes, setRecipes] = useState<RecipeView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecipes = async () => {
      const { data } = await supabase
        .from('recipes')
        .select('variant, quantity_needed, menu_items(name), inventory_items(name, unit)')
        .order('variant')

      if (!data) { setLoading(false); return }

      type RecipeRow = {
        variant: string
        quantity_needed: number
        menu_items: { name: string }
        inventory_items: { name: string; unit: string }
      }
      const grouped = new Map<string, RecipeView>()
      for (const row of data as unknown as RecipeRow[]) {
        const key = `${row.menu_items.name}-${row.variant}`
        if (!grouped.has(key)) {
          grouped.set(key, {
            menu_item_name: row.menu_items.name,
            variant: row.variant,
            ingredients: [],
          })
        }
        grouped.get(key)!.ingredients.push({
          name: row.inventory_items.name,
          quantity_needed: row.quantity_needed,
          unit: row.inventory_items.unit,
        })
      }

      setRecipes(Array.from(grouped.values()))
      setLoading(false)
    }
    fetchRecipes()
  }, [supabase])

  if (loading) return <div className="p-6 text-center text-gray-400">Loading recipes...</div>

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/inventory" className="text-brand-muted hover:text-brand-dark text-sm">
          &larr; Inventory
        </Link>
        <h2 className="text-xl font-bold text-brand-dark">Recipes</h2>
      </div>

      <div className="space-y-3">
        {recipes.map((recipe) => (
          <div key={`${recipe.menu_item_name}-${recipe.variant}`} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-sm text-brand-dark">{recipe.menu_item_name}</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-light text-brand-dark capitalize">
                {recipe.variant}
              </span>
            </div>
            <div className="space-y-1">
              {recipe.ingredients.map((ing) => (
                <div key={ing.name} className="flex justify-between text-xs text-brand-muted">
                  <span>{ing.name}</span>
                  <span className="font-medium text-brand-dark">
                    {ing.quantity_needed} {ing.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
