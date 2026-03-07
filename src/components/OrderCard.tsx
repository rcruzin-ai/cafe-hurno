import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '@/lib/constants'
import type { OrderWithItems } from '@/lib/types'

export default function OrderCard({ order }: { order: OrderWithItems }) {
  const paymentStatus = order.payment_status || 'unpaid'
  const isPending = order.status === 'pending'

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border ${isPending ? 'border-brand-brown/20' : 'border-gray-100/60'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isPending && order.queue_number && (
            <div className="bg-brand-dark text-white text-sm font-bold w-9 h-9 rounded-full flex items-center justify-center shrink-0">
              #{order.queue_number}
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
            {isPending && <p className="text-xs text-brand-brown font-medium mt-0.5">Preparing your order...</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${PAYMENT_STATUS_COLORS[paymentStatus]}`}>
            {PAYMENT_STATUS_LABELS[paymentStatus]}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.menu_items?.name}
              <span className="text-gray-400 ml-1 text-xs capitalize">({item.variant}) ×{item.quantity}</span>
            </span>
            <span className="text-brand-dark font-medium">₱{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 mt-3 pt-2.5 flex justify-between items-center">
        <span className="text-xs text-gray-400">Total</span>
        <span className="font-bold text-brand-brown">₱{order.total}</span>
      </div>
    </div>
  )
}
