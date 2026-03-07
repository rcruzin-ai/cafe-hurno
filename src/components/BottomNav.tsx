'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'

const navItems = [
  { href: '/menu', label: 'Menu', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { href: '/cart', label: 'Cart', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z' },
  { href: '/orders', label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { href: '/profile', label: 'Account', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const itemCount = useCartStore((s) => s.getItemCount())

  if (pathname === '/' || pathname.startsWith('/admin')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.slice(0, 2).map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
                isActive ? 'text-brand-brown' : 'text-gray-400'
              }`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.href === '/cart' && itemCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-brand-pink-dark text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
              <span>{item.label}</span>
            </Link>
          )
        })}
        <Link
          href="/pay"
          className={`flex flex-col items-center gap-0.5 text-[10px] ${pathname === '/pay' ? 'text-brand-brown' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="6" height="6" rx="0.5" strokeWidth="1.5"/>
            <rect x="15" y="3" width="6" height="6" rx="0.5" strokeWidth="1.5"/>
            <rect x="3" y="15" width="6" height="6" rx="0.5" strokeWidth="1.5"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15h2M15 19h2M19 15v2M19 21v-2M21 15h-2M21 19h-2" />
          </svg>
          Pay
        </Link>
        {navItems.slice(2).map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
                isActive ? 'text-brand-brown' : 'text-gray-400'
              }`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
