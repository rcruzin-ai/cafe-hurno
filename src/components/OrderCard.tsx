import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/constants'
import type { OrderWithItems } from '@/lib/types'

export default function OrderCard({ order }: { order: OrderWithItems }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">
          {new Date(order.created_at).toLocaleString()}
        </span>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="space-y-1.5">
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.menu_items?.name}
              <span className="text-gray-400 ml-1 capitalize text-xs">({item.variant})</span>
              <span className="text-gray-400 ml-1">x{item.quantity}</span>
            </span>
            <span className="text-brand-dark font-medium">₱{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="border-t mt-3 pt-2 flex justify-between">
        <span className="text-sm text-gray-500">Total</span>
        <span className="font-bold text-brand-brown">₱{order.total}</span>
      </div>
    </div>
  )
}
