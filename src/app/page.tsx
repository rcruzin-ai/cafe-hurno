import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-hero text-white">
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Image
          src="/images/logo.png"
          alt="Cafe Hurno"
          width={180}
          height={180}
          className="mb-6"
          priority
        />
        <h1 className="text-3xl font-bold mb-2">Cafe Hurno</h1>
        <p className="text-gray-300 mb-8 text-sm">
          Cozy coffee corner for all coffee lovers
        </p>
        <Link
          href="/menu"
          className="bg-brand-accent text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-brand-brown transition-colors"
        >
          Get Started
        </Link>
      </div>

      {/* Footer accent */}
      <div className="h-2 bg-brand-accent" />
    </div>
  )
}
