import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, MenuItem, DrinkVariant } from '@/lib/types'

interface CartStore {
  items: CartItem[]
  addItem: (menuItem: MenuItem, variant: DrinkVariant) => void
  removeItem: (menuItemId: string, variant: DrinkVariant) => void
  updateQuantity: (menuItemId: string, variant: DrinkVariant, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (menuItem, variant) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.menuItem.id === menuItem.id && i.variant === variant
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.menuItem.id === menuItem.id && i.variant === variant
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }
          return { items: [...state.items, { menuItem, variant, quantity: 1 }] }
        })
      },

      removeItem: (menuItemId, variant) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.menuItem.id === menuItemId && i.variant === variant)
          ),
        }))
      },

      updateQuantity: (menuItemId, variant, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId, variant)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.menuItem.id === menuItemId && i.variant === variant
              ? { ...i, quantity }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        return get().items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0)
      },

      getItemCount: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },
    }),
    { name: 'cafe-hurno-cart' }
  )
)
