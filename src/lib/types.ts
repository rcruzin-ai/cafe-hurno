export type UserRole = 'customer' | 'admin'
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed'
export type DrinkVariant = 'hot' | 'cold'

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
  created_at: string
}

export interface Order {
  id: string
  customer_id: string
  status: OrderStatus
  total: number
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
