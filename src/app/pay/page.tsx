import Image from 'next/image'

export default function PayPage() {
  return (
    <div className="px-4 py-6 flex flex-col items-center">
      <h1 className="text-xl font-bold text-brand-dark mb-1">Pay via GCash</h1>
      <p className="text-sm text-gray-500 mb-6 text-center">
        Scan the QR code below to pay via GCash e-wallet
      </p>
      <div className="rounded-2xl overflow-hidden shadow-md max-w-xs w-full">
        <Image
          src="/images/e-wallet.png"
          alt="GCash QR Code - Cafe Hurno"
          width={400}
          height={600}
          className="w-full h-auto"
          priority
        />
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">
        Transfer fees may apply. Show your GCash receipt to the cashier.
      </p>
    </div>
  )
}
