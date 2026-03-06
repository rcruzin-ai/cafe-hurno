import { createClient } from '@/lib/supabase/server'
import MenuCard from '@/components/MenuCard'
import type { MenuItem } from '@/lib/types'

export default async function MenuPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('available', true)
    .order('name')

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">Good day!</h1>
        <p className="text-sm text-brand-muted mt-1">What would you like to order?</p>
      </div>

      <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
        Our Drinks
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {(items as MenuItem[] || []).map((item) => (
          <MenuCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
