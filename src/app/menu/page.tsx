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
      <h1 className="text-2xl font-bold text-brand-dark mb-1">Our Menu</h1>
      <p className="text-sm text-gray-500 mb-6">Choose your favorite brew</p>

      <div className="grid grid-cols-2 gap-3">
        {(items as MenuItem[] || []).map((item) => (
          <MenuCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
