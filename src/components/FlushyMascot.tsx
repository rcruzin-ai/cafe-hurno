'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const SINGLE_IMAGES = [
  { src: '/images/flushy.png', alt: 'Flushy mascot' },
  { src: '/images/flushy2.png', alt: 'Flushy waving' },
  { src: '/images/flushy3.png', alt: 'Flushy with coffee' },
]

export default function FlushyMascot() {
  // 0–2 = single image index, 3 = group frame
  const [pick, setPick] = useState<number | null>(null)

  useEffect(() => {
    setPick(Math.floor(Math.random() * 4))
  }, [])

  if (pick === null) {
    // placeholder to prevent layout shift
    return <div style={{ width: 200, height: 200 }} />
  }

  if (pick === 3) {
    // All 3 together in one frame
    return (
      <div className="flex items-end justify-center gap-1 bg-white/60 rounded-3xl px-4 pt-4 pb-2 shadow-sm">
        <Image
          src="/images/flushy.png"
          alt="Flushy mascot"
          width={70}
          height={70}
          className="drop-shadow-sm"
        />
        <Image
          src="/images/flushy3.png"
          alt="Flushy with coffee"
          width={90}
          height={90}
          className="drop-shadow-sm -mb-1"
        />
        <Image
          src="/images/flushy2.png"
          alt="Flushy waving"
          width={70}
          height={70}
          className="drop-shadow-sm"
        />
      </div>
    )
  }

  return (
    <Image
      src={SINGLE_IMAGES[pick].src}
      alt={SINGLE_IMAGES[pick].alt}
      width={200}
      height={200}
      className="drop-shadow-lg"
      priority
    />
  )
}
