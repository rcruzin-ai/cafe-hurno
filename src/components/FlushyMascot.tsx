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
    // All 3 together — flushy3 center front, flushy2 left, flushy1 right
    return (
      <div className="relative h-[200px] w-[260px]">
        {/* flushy2 (waving) — left, peeking from behind center */}
        <Image
          src="/images/flushy2.png"
          alt="Flushy waving"
          width={145}
          height={145}
          className="drop-shadow-lg absolute bottom-0 left-[10px] z-10"
        />
        {/* flushy1 (standing) — right, peeking from behind center */}
        <Image
          src="/images/flushy.png"
          alt="Flushy mascot"
          width={145}
          height={145}
          className="drop-shadow-lg absolute bottom-0 right-[10px] z-10"
        />
        {/* flushy3 (coffee) — center, in front */}
        <Image
          src="/images/flushy3.png"
          alt="Flushy with coffee"
          width={160}
          height={160}
          className="drop-shadow-lg absolute bottom-0 left-1/2 -translate-x-1/2 z-20"
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
