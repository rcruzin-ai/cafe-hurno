import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, MenuItem, DrinkVariant } from '@/lib/types'

export const EXTRA_SHOT_PRICE = 20

interface CartStore {
  items: CartItem[]
  addItem: (menuItem: MenuItem, variant: DrinkVariant) => void
  removeItem: (menuItemId: string, variant: DrinkVariant) => void
  updateQuantity: (menuItemId: string, variant: DrinkVariant, quantity: number) => void
  toggleExtraShot: (menuItemId: string, variant: DrinkVariant) => void
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
          return { items: [...state.items, { menuItem, variant, quantity: 1, extraShot: false }] }
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

      toggleExtraShot: (menuItemId, variant) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.menuItem.id === menuItemId && i.variant === variant
              ? { ...i, extraShot: !i.extraShot }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        return get().items.reduce((sum, i) => {
          const itemPrice = i.menuItem.price + (i.extraShot ? EXTRA_SHOT_PRICE : 0)
          return sum + itemPrice * i.quantity
        }, 0)
      },

      getItemCount: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },
    }),
    { name: 'cafe-hurno-cart' }
  )
)
