import Image from 'next/image'
import Link from 'next/link'
import AuthHomeButtons from '@/components/AuthHomeButtons'
import FlushyMascot from '@/components/FlushyMascot'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-cream">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10 pb-6">
        {/* Mascot with bounce animation */}
        <div className="animate-mascot-bounce mb-4 flex justify-center">
          <FlushyMascot />
        </div>

        {/* Logo badge */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-3 mb-4 inline-flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="Café Hurno Logo"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div className="text-left">
            <h1 className="text-3xl font-bold text-brand-dark tracking-tight">Café Hurno</h1>
            <p className="text-brand-muted text-sm mt-1">Your cozy coffee corner</p>
          </div>
        </div>

        <p className="text-brand-muted text-sm mb-8 max-w-[240px] leading-relaxed">
          Order ahead, skip the wait.<br />Fresh brewed just for you.
        </p>

        <AuthHomeButtons />

        <Link
          href="/menu"
          className="mt-5 text-brand-muted text-sm hover:text-brand-brown transition"
        >
          Just browsing? View our menu
        </Link>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-transparent via-brand-pink-dark to-transparent mx-10 mb-4 opacity-40" />
    </div>
  )
}
