import Image from 'next/image'
import Link from 'next/link'
import AuthHomeButtons from '@/components/AuthHomeButtons'
import FlushyMascot from '@/components/FlushyMascot'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-cream">
      {/* Floating coffee beans decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[8%] w-3 h-3 rounded-full bg-brand-pink/30 animate-float-slow" />
        <div className="absolute top-[20%] right-[12%] w-2 h-2 rounded-full bg-brand-pink/20 animate-float-delayed" />
        <div className="absolute top-[60%] left-[15%] w-2.5 h-2.5 rounded-full bg-brand-brown/10 animate-float-slow" />
        <div className="absolute top-[45%] right-[8%] w-2 h-2 rounded-full bg-brand-pink/25 animate-float-delayed" />
        <div className="absolute bottom-[25%] left-[20%] w-1.5 h-1.5 rounded-full bg-brand-brown/10 animate-float-slow" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10 pb-6">
        {/* Mascot with bounce animation */}
        <div className="animate-mascot-bounce mb-4 flex justify-center">
          <FlushyMascot />
        </div>

        {/* Logo badge */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-3 mb-4 inline-flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="Cafe Hurno Logo"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div className="text-left">
            <h1 className="text-lg font-bold text-brand-dark leading-tight">Cafe Hurno</h1>
            <p className="text-[11px] text-brand-muted">Your cozy coffee corner</p>
          </div>
        </div>

        <p className="text-brand-muted text-sm mb-6 max-w-[260px]">
          Order ahead, skip the wait. Fresh brewed just for you.
        </p>

        <AuthHomeButtons />

        <Link
          href="/menu"
          className="mt-4 text-brand-muted text-sm underline underline-offset-4 hover:text-brand-brown transition"
        >
          Just browsing? View our menu
        </Link>
      </div>

      <div className="h-1 bg-gradient-to-r from-brand-pink via-brand-pink-dark to-brand-pink rounded-full mx-8 mb-3" />
    </div>
  )
}
