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
    // All 3 together — overlapping, same height as single (200px)
    return (
      <div className="relative h-[200px] w-[220px]">
        <Image
          src="/images/flushy.png"
          alt="Flushy mascot"
          width={150}
          height={150}
          className="drop-shadow-lg absolute bottom-0 left-0 z-10"
        />
        <Image
          src="/images/flushy3.png"
          alt="Flushy with coffee"
          width={160}
          height={160}
          className="drop-shadow-lg absolute bottom-0 left-1/2 -translate-x-1/2 z-20"
        />
        <Image
          src="/images/flushy2.png"
          alt="Flushy waving"
          width={150}
          height={150}
          className="drop-shadow-lg absolute bottom-0 right-0 z-10"
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
