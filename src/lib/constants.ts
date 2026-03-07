export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  completed: 'Completed',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  preparing: 'bg-blue-50 text-blue-700',
  ready: 'bg-green-50 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
}

export const ADMIN_EMAIL = 'raymond.cruzin.ai@gmail.com'

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid',
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-red-50 text-red-700',
  paid: 'bg-green-50 text-green-700',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  wallet: 'E-Wallet',
}
