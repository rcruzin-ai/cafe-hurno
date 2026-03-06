'use client'

import { QRCodeCanvas } from 'qrcode.react'
import { useRef } from 'react'

export default function QRPage() {
  const canvasRef = useRef<HTMLDivElement>(null)

  const menuUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/menu`
    : ''

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'cafe-hurno-menu-qr.png'
    a.click()
  }

  return (
    <div className="px-4 py-6 text-center">
      <h2 className="text-xl font-bold text-brand-dark mb-2">Menu QR Code</h2>
      <p className="text-sm text-gray-500 mb-6">
        Print this QR code and place it on your tables
      </p>

      <div ref={canvasRef} className="inline-block bg-white p-6 rounded-2xl shadow-sm">
        {menuUrl && (
          <QRCodeCanvas
            value={menuUrl}
            size={220}
            level="H"
            includeMargin
            imageSettings={{
              src: '/images/logo.png',
              x: undefined,
              y: undefined,
              height: 40,
              width: 40,
              excavate: true,
            }}
          />
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3 break-all">{menuUrl}</p>

      <button
        onClick={handleDownload}
        className="mt-6 bg-brand-pink-dark text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-brand-dark transition"
      >
        Download QR Code
      </button>
    </div>
  )
}
