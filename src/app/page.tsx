import Image from 'next/image'
import Link from 'next/link'
import AuthHomeButtons from '@/components/AuthHomeButtons'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-dark text-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Image
          src="/images/logo.png"
          alt="Cafe Hurno"
          width={160}
          height={160}
          className="mb-8"
          priority
        />
        <h1 className="text-3xl font-bold tracking-tight mb-2">Cafe Hurno</h1>
        <p className="text-white/60 text-sm mb-10 max-w-[250px]">
          Your cozy coffee corner. Order ahead, skip the wait.
        </p>

        <AuthHomeButtons />

        <Link
          href="/menu"
          className="mt-4 text-white/50 text-sm underline underline-offset-4 hover:text-white/80 transition"
        >
          Just browsing? View our menu
        </Link>
      </div>

      <div className="h-1.5 bg-brand-pink" />
    </div>
  )
}
