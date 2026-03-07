export type UserRole = 'customer' | 'admin' | 'super_admin'
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'voided'
export type DrinkVariant = 'hot' | 'cold'
export type PaymentStatus = 'unpaid' | 'paid'
export type PaymentMethod = 'cash' | 'wallet' | null

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
}

export interface MenuItem {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price: number
  hot_size_oz: number
  cold_size_oz: number
  available: boolean
  hot_available: boolean
  created_at: string
}

export interface Order {
  id: string
  customer_id: string | null  // null for guest orders
  customer_name: string | null  // guest name
  status: OrderStatus
  total: number
  queue_number: number | null
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  created_at: string
  updated_at: string
}

export interface OrderWithItems extends Order {
  order_items: OrderItemWithMenu[]
  profiles?: Profile
  feedback?: Feedback[]
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  variant: DrinkVariant
  quantity: number
  price: number
}

export interface OrderItemWithMenu extends OrderItem {
  menu_items: MenuItem
}

export interface Feedback {
  id: string
  order_id: string
  customer_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface CartItem {
  menuItem: MenuItem
  variant: DrinkVariant
  quantity: number
}

export interface InventoryItem {
  id: string
  name: string
  unit: string
  current_stock: number
  low_stock_threshold: number
  created_at: string
}

export interface Recipe {
  id: string
  menu_item_id: string
  variant: DrinkVariant
  inventory_item_id: string
  quantity_needed: number
}

export interface InventoryLog {
  id: string
  inventory_item_id: string
  change_amount: number
  reason: 'order_deduction' | 'restock' | 'adjustment'
  reference_id: string | null
  created_at: string
}
