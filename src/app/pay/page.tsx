import Image from 'next/image'

export default function PayPage() {
  return (
    <div className="px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-brand-dark">Pay via GCash</h1>
        <p className="text-sm text-brand-muted mt-1">Scan to pay for your order</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/60 flex flex-col items-center">
        <div className="rounded-xl overflow-hidden w-full max-w-[280px]">
          <Image
            src="/images/e-wallet.png"
            alt="GCash QR Code - Cafe Hurno"
            width={400}
            height={600}
            className="w-full h-auto"
            priority
          />
        </div>
      </div>

      <div className="mt-4 bg-brand-dark/5 rounded-xl p-3">
        <p className="text-xs text-brand-muted text-center leading-relaxed">
          After paying, show your GCash receipt to the cashier.<br/>Transfer fees may apply.
        </p>
      </div>
    </div>
  )
}
