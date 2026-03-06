# Milestone 2: UX Overhaul, Realtime Fix & Inventory System

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix realtime order updates, redesign UX with a Starbucks-inspired flow using the Cafe Hurno brand palette (dark brown, white, light pink), and add an admin inventory tracking system that auto-deducts ingredients per order.

**Architecture:** Four independent workstreams: (1) Fix realtime subscription bug on orders page, (2) Redesign the customer-facing UX flow with login-first home, improved menu/cart/orders pages using the dark brown/white/pink brand colors, (3) Add inventory DB tables + recipe definitions + auto-deduction logic, (4) Build admin inventory management UI. Each workstream commits independently.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (Postgres + Auth + Realtime), Zustand, Vercel.

---

## Workstream A: Fix Realtime Order Status Updates

### Task A1: Fix realtime subscription cleanup in orders page

**Files:**
- Modify: `src/app/orders/page.tsx:17-61`

**Context:** The current `useEffect` returns a cleanup function from the async `fetchOrders()` inner function, but `useEffect` ignores return values from async functions. The `supabase.removeChannel(channel)` cleanup never runs, causing stale/duplicate subscriptions. Additionally, the realtime channel only listens for UPDATE events but doesn't re-fetch full order data (with items), so the merged payload lacks `order_items`.

**Step 1: Rewrite the useEffect to properly subscribe and clean up**

Replace the entire `useEffect` block (lines 17-61) with:

```tsx
useEffect(() => {
  let channel: ReturnType<typeof supabase.channel> | null = null

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/menu')
      return
    }

    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(*))')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
      setOrders((data as OrderWithItems[]) || [])
      setLoading(false)
    }

    await fetchOrders()

    channel = supabase
      .channel('my-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          // Re-fetch full orders (with items) on any change
          fetchOrders()
        }
      )
      .subscribe()
  }

  init()

  return () => {
    if (channel) supabase.removeChannel(channel)
  }
}, [supabase, router])
```

**Key changes:**
- Channel variable is declared in outer scope so cleanup actually runs
- Listens for ALL events (`*`), not just `UPDATE` (catches new orders too)
- Re-fetches full order data (with `order_items` join) instead of shallow-merging the payload (which lacked nested relations)

**Step 2: Verify the fix**

Run: `npx next build`
Expected: Build succeeds with no type errors.

Manual test:
1. Open /orders in one tab
2. Open /admin in another tab (logged in as admin)
3. Change an order status in admin
4. Verify /orders updates instantly without page reload

**Step 3: Commit**

```bash
git add src/app/orders/page.tsx
git commit -m "fix: realtime order status updates - proper cleanup and full refetch"
```

---

## Workstream B: UX Redesign (Starbucks-Inspired)

### Task B1: Update color palette and add new Tailwind tokens

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`

**Step 1: Extend Tailwind config with brand-aligned palette**

The logo is dark brown on white with a warm feel. We add a light pink accent for buttons/highlights, keeping the cozy coffee-shop identity.

Replace the `colors.brand` object in `tailwind.config.ts` with:

```ts
brand: {
  dark: '#5C3D2E',      // Dark brown (from logo, primary text/headers)
  brown: '#8B4513',     // Medium brown (secondary elements)
  pink: '#E8B4B8',      // Light pink (accent buttons, highlights)
  'pink-dark': '#D4919A', // Deeper pink (hover states)
  cream: '#FFF8F0',     // Warm cream (page background)
  light: '#FDF0EC',     // Light blush (card backgrounds, badges)
  white: '#FFFFFF',     // Pure white (cards)
  muted: '#9C8578',     // Muted brown (secondary text)
  hero: '#5C3D2E',      // Hero/splash background (matches logo)
},
```

**Step 2: Update globals.css**

Replace body background:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: #FFF8F0;
  color: #5C3D2E;
  min-height: 100dvh;
}

main {
  padding-bottom: 5rem;
}
```

**Step 3: Commit**

```bash
git add tailwind.config.ts src/app/globals.css
git commit -m "style: update color palette to dark brown/white/pink brand theme"
```

---

### Task B2: Redesign home page as login-first landing

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Rewrite home page**

The new home page should:
- Show the Cafe Hurno logo and tagline
- Prominently show "Sign in with Google" button
- Show a secondary "View Menu" link for guests who just want to browse
- Use the new green color scheme
- Feel premium and clean (centered layout, generous spacing)

```tsx
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
```

**Step 2: Create AuthHomeButtons client component**

Create: `src/components/AuthHomeButtons.tsx`

This component checks auth state and shows either "Sign in with Google" or "Welcome back, [name] - Order Now" button:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function AuthHomeButtons() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
  }, [supabase])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/menu` },
    })
  }

  if (loading) {
    return <div className="h-12" /> // Placeholder to prevent layout shift
  }

  if (user) {
    return (
      <button
        onClick={() => router.push('/menu')}
        className="w-full max-w-[280px] bg-brand-pink text-brand-dark py-3.5 rounded-full text-base font-semibold hover:bg-brand-pink-dark transition"
      >
        Start Ordering
      </button>
    )
  }

  return (
    <button
      onClick={handleLogin}
      className="w-full max-w-[280px] bg-white text-brand-dark py-3.5 rounded-full text-base font-semibold hover:bg-white/90 transition flex items-center justify-center gap-3"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      Sign in with Google
    </button>
  )
}
```

**Step 3: Verify build**

Run: `npx next build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/page.tsx src/components/AuthHomeButtons.tsx
git commit -m "feat: redesign home page with login-first flow and guest browsing option"
```

---

### Task B3: Redesign bottom navigation

**Files:**
- Modify: `src/components/BottomNav.tsx`

**Step 1: Update BottomNav with polished design and cart badge**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'

const navItems = [
  { href: '/menu', label: 'Menu', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', useStroke: true },
  { href: '/cart', label: 'Cart', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z', useStroke: true },
  { href: '/orders', label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', useStroke: true },
  { href: '/profile', label: 'Account', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', useStroke: true },
]

export default function BottomNav() {
  const pathname = usePathname()
  const itemCount = useCartStore((s) => s.getItemCount())

  if (pathname === '/' || pathname.startsWith('/admin')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
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
      </div>
    </nav>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/BottomNav.tsx
git commit -m "style: redesign bottom nav with SVG icons and cart badge"
```

---

### Task B4: Redesign menu page with category header and improved cards

**Files:**
- Modify: `src/app/menu/page.tsx`
- Modify: `src/components/MenuCard.tsx`

**Step 1: Update menu page with a welcoming header**

```tsx
import { createClient } from '@/lib/supabase/server'
import MenuCard from '@/components/MenuCard'
import type { MenuItem } from '@/lib/types'

export default async function MenuPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('available', true)
    .order('name')

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">Good day!</h1>
        <p className="text-sm text-brand-muted mt-1">What would you like to order?</p>
      </div>

      <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
        Our Drinks
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {(items as MenuItem[] || []).map((item) => (
          <MenuCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Redesign MenuCard with cleaner layout**

```tsx
'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import type { MenuItem, DrinkVariant } from '@/lib/types'

export default function MenuCard({ item }: { item: MenuItem }) {
  const [variant, setVariant] = useState<DrinkVariant>('hot')
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(item, variant)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="relative h-36 bg-brand-dark">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl">
            <span className="text-white/30">&#9749;</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-brand-dark leading-tight">{item.name}</h3>
        <p className="text-[11px] text-brand-muted mt-0.5 line-clamp-2">{item.description}</p>

        {/* Variant toggle */}
        <div className="flex gap-1.5 mt-2">
          {(['hot', 'cold'] as DrinkVariant[]).map((v) => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              className={`flex-1 text-[10px] py-1 rounded-full font-medium transition capitalize ${
                variant === v
                  ? 'bg-brand-dark text-white'
                  : 'bg-gray-100 text-brand-muted'
              }`}
            >
              {v} ({v === 'hot' ? item.hot_size_oz : item.cold_size_oz}oz)
            </button>
          ))}
        </div>

        {/* Price & Add */}
        <div className="flex items-center justify-between mt-2.5">
          <span className="font-bold text-sm text-brand-brown">P{item.price}</span>
          <button
            onClick={handleAdd}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition text-sm ${
              added
                ? 'bg-brand-pink-dark text-white'
                : 'bg-brand-pink/20 text-brand-brown hover:bg-brand-pink-dark hover:text-white'
            }`}
          >
            {added ? '&#10003;' : '+'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/menu/page.tsx src/components/MenuCard.tsx
git commit -m "style: redesign menu page and cards with brand theme"
```

---

### Task B5: Redesign cart page

**Files:**
- Modify: `src/app/cart/page.tsx`
- Modify: `src/components/CartItemRow.tsx`

**Step 1: Update CartItemRow with cleaner design**

```tsx
'use client'

import Image from 'next/image'
import { useCartStore } from '@/lib/store/cart'
import type { CartItem } from '@/lib/types'

export default function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-brand-dark shrink-0">
        {item.menuItem.image_url ? (
          <Image
            src={item.menuItem.image_url}
            alt={item.menuItem.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xl text-white/30">&#9749;</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-brand-dark truncate">{item.menuItem.name}</h3>
        <p className="text-[11px] text-brand-muted capitalize">{item.variant} &middot; {item.variant === 'hot' ? item.menuItem.hot_size_oz : item.menuItem.cold_size_oz}oz</p>
        <p className="text-sm font-bold text-brand-brown mt-0.5">P{item.menuItem.price * item.quantity}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(item.menuItem.id, item.variant, item.quantity - 1)}
          className="w-7 h-7 rounded-full bg-gray-100 text-brand-dark text-sm font-medium flex items-center justify-center hover:bg-gray-200 transition"
        >
          -
        </button>
        <span className="text-sm font-semibold text-brand-dark w-5 text-center">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.menuItem.id, item.variant, item.quantity + 1)}
          className="w-7 h-7 rounded-full bg-brand-pink/20 text-brand-brown text-sm font-medium flex items-center justify-center hover:bg-brand-pink-dark hover:text-white transition"
        >
          +
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Update cart page with improved layout and order summary**

Update the JSX in `src/app/cart/page.tsx`. Keep the existing state logic and handlers. Update the return block and the OrderSuccess component to use the new color scheme:

- Replace `bg-brand-accent` with `bg-brand-pink-dark`
- Replace `hover:bg-brand-brown` with `hover:bg-brand-dark`
- Keep `text-brand-dark` and `text-brand-brown` as-is (they match the logo)
- Replace `bg-brand-brown` (for Sign in button) with `bg-brand-dark`

**Step 3: Commit**

```bash
git add src/app/cart/page.tsx src/components/CartItemRow.tsx
git commit -m "style: redesign cart page and item rows with new theme"
```

---

### Task B6: Redesign orders page and OrderCard

**Files:**
- Modify: `src/components/OrderCard.tsx`

**Step 1: Read the current OrderCard component, then update it**

Update OrderCard to use the new color scheme and improve the layout:
- Use `text-brand-dark` for headings
- Use `text-brand-brown` for totals
- Use the existing `ORDER_STATUS_COLORS` (we will update those next)
- Add a subtle progress indicator showing which stage the order is at

**Step 2: Update status colors in constants**

Modify `src/lib/constants.ts`:

```ts
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  completed: 'Completed',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  preparing: 'bg-blue-50 text-blue-700',
  ready: 'bg-green-50 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
}

export const ADMIN_EMAIL = 'raymond.cruzin.ai@gmail.com'
```

**Step 3: Commit**

```bash
git add src/components/OrderCard.tsx src/lib/constants.ts
git commit -m "style: redesign order cards and update status colors"
```

---

### Task B7: Redesign profile page

**Files:**
- Modify: `src/app/profile/page.tsx`

**Step 1: Update profile page with new color scheme**

Update colors:
- Replace `bg-brand-brown` with `bg-brand-dark`
- Keep `text-brand-brown` as-is (matches brand)
- Replace `bg-brand-cream` with `bg-brand-light`
- Replace `bg-brand-dark` (admin button) with `bg-brand-pink-dark text-white`

**Step 2: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "style: update profile page colors"
```

---

### Task B8: Update admin layout and pages with new theme

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/components/AdminOrderRow.tsx`
- Modify: `src/app/admin/qr/page.tsx`

**Step 1: Update admin layout header colors**

Replace brown/accent colors with the new green palette:
- Header background: `bg-brand-dark`
- Active nav links: `text-brand-pink`
- Buttons: `bg-brand-pink-dark`

**Step 2: Update AdminOrderRow**

Replace `bg-brand-accent` with `bg-brand-pink-dark` and `hover:bg-brand-brown` with `hover:bg-brand-dark` for the status advance button. Keep `text-brand-brown` for the total (matches brand).

**Step 3: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/page.tsx src/components/AdminOrderRow.tsx src/app/admin/qr/page.tsx
git commit -m "style: update admin pages with new green/gold theme"
```

---

## Workstream C: Inventory System (Database + Logic)

### Task C1: Create inventory database schema

**Files:**
- Create: `supabase/inventory-schema.sql`

**Step 1: Write the inventory schema SQL**

This creates three tables:
1. `inventory_items` - Raw materials (cups, lids, milk, coffee, etc.)
2. `recipes` - Links menu items to their required ingredients per variant
3. `inventory_log` - Tracks all inventory changes (deductions, restocks)

```sql
-- Inventory items (raw materials)
create table public.inventory_items (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  unit text not null, -- 'pcs', 'ml', 'g'
  current_stock numeric not null default 0,
  low_stock_threshold numeric not null default 10,
  created_at timestamptz default now()
);

-- Recipes: what ingredients each drink variant needs
create table public.recipes (
  id uuid default uuid_generate_v4() primary key,
  menu_item_id uuid references public.menu_items(id) on delete cascade not null,
  variant text not null check (variant in ('hot', 'cold')),
  inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
  quantity_needed numeric not null,
  unique(menu_item_id, variant, inventory_item_id)
);

-- Inventory change log (for audit trail)
create table public.inventory_log (
  id uuid default uuid_generate_v4() primary key,
  inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
  change_amount numeric not null, -- negative for deductions, positive for restocks
  reason text not null, -- 'order_deduction', 'restock', 'adjustment'
  reference_id uuid, -- order_id if reason is order_deduction
  created_at timestamptz default now()
);

-- RLS policies
alter table public.inventory_items enable row level security;
alter table public.recipes enable row level security;
alter table public.inventory_log enable row level security;

-- Only admins can read/write inventory
create policy "Admins can manage inventory items"
  on public.inventory_items for all
  using (is_admin())
  with check (is_admin());

create policy "Admins can manage recipes"
  on public.recipes for all
  using (is_admin())
  with check (is_admin());

create policy "Admins can manage inventory log"
  on public.inventory_log for all
  using (is_admin())
  with check (is_admin());
```

**Step 2: Commit**

```bash
git add supabase/inventory-schema.sql
git commit -m "feat: add inventory database schema (items, recipes, log)"
```

---

### Task C2: Create inventory seed data with recipes

**Files:**
- Create: `supabase/inventory-seed.sql`

**Step 1: Write seed data for inventory items and recipes**

Based on the user's recipe specifications:

```sql
-- Insert inventory items
insert into public.inventory_items (id, name, unit, current_stock, low_stock_threshold) values
  ('11111111-0000-0000-0000-000000000001', '16oz Cup', 'pcs', 100, 20),
  ('11111111-0000-0000-0000-000000000002', '12oz Cup', 'pcs', 100, 20),
  ('11111111-0000-0000-0000-000000000003', '16oz Lid', 'pcs', 100, 20),
  ('11111111-0000-0000-0000-000000000004', '12oz Lid', 'pcs', 100, 20),
  ('11111111-0000-0000-0000-000000000005', 'Milk', 'ml', 5000, 500),
  ('11111111-0000-0000-0000-000000000006', 'Condensed Milk', 'g', 2000, 200),
  ('11111111-0000-0000-0000-000000000007', 'Ground Coffee', 'g', 2000, 200),
  ('11111111-0000-0000-0000-000000000008', 'Straw', 'pcs', 200, 30),
  ('11111111-0000-0000-0000-000000000009', 'Sugar Syrup', 'g', 2000, 200);

-- NOTE: Recipes reference menu_items by name. You must run this AFTER seed.sql.
-- The menu_item_ids below are placeholders. The actual INSERT must use:
--   (select id from menu_items where name = 'Spanish Latte')
-- etc.

-- Spanish Latte - Cold
insert into public.recipes (menu_item_id, variant, inventory_item_id, quantity_needed)
select mi.id, 'cold', ii.id, amounts.qty
from (values
  ('16oz Cup', 1), ('16oz Lid', 1), ('Milk', 30), ('Condensed Milk', 12),
  ('Ground Coffee', 12), ('Straw', 1)
) as amounts(item_name, qty)
join public.inventory_items ii on ii.name = amounts.item_name
cross join (select id from public.menu_items where name = 'Spanish Latte') mi;

-- Spanish Latte - Hot
insert into public.recipes (menu_item_id, variant, inventory_item_id, quantity_needed)
select mi.id, 'hot', ii.id, amounts.qty
from (values
  ('12oz Cup', 1), ('12oz Lid', 1), ('Milk', 30), ('Condensed Milk', 12),
  ('Ground Coffee', 12)
) as amounts(item_name, qty)
join public.inventory_items ii on ii.name = amounts.item_name
cross join (select id from public.menu_items where name = 'Spanish Latte') mi;

-- Latte - Cold
insert into public.recipes (menu_item_id, variant, inventory_item_id, quantity_needed)
select mi.id, 'cold', ii.id, amounts.qty
from (values
  ('16oz Cup', 1), ('16oz Lid', 1), ('Milk', 30), ('Ground Coffee', 12),
  ('Straw', 1), ('Sugar Syrup', 10)
) as amounts(item_name, qty)
join public.inventory_items ii on ii.name = amounts.item_name
cross join (select id from public.menu_items where name = 'Latte') mi;

-- Latte - Hot
insert into public.recipes (menu_item_id, variant, inventory_item_id, quantity_needed)
select mi.id, 'hot', ii.id, amounts.qty
from (values
  ('12oz Cup', 1), ('12oz Lid', 1), ('Milk', 30), ('Ground Coffee', 12),
  ('Sugar Syrup', 10)
) as amounts(item_name, qty)
join public.inventory_items ii on ii.name = amounts.item_name
cross join (select id from public.menu_items where name = 'Latte') mi;

-- Cappuccino - Cold
insert into public.recipes (menu_item_id, variant, inventory_item_id, quantity_needed)
select mi.id, 'cold', ii.id, amounts.qty
from (values
  ('16oz Cup', 1), ('16oz Lid', 1), ('Milk', 40), ('Ground Coffee', 12),
  ('Straw', 1), ('Sugar Syrup', 8)
) as amounts(item_name, qty)
join public.inventory_items ii on ii.name = amounts.item_name
cross join (select id from public.menu_items where name = 'Cappuccino') mi;

-- Cappuccino - Hot
insert into public.recipes (menu_item_id, variant, inventory_item_id, quantity_needed)
select mi.id, 'hot', ii.id, amounts.qty
from (values
  ('12oz Cup', 1), ('12oz Lid', 1), ('Milk', 40), ('Ground Coffee', 12),
  ('Sugar Syrup', 8)
) as amounts(item_name, qty)
join public.inventory_items ii on ii.name = amounts.item_name
cross join (select id from public.menu_items where name = 'Cappuccino') mi;

-- Americano - Cold
insert into public.recipes (menu_item_id, variant, inventory_item_id, quantity_needed)
select mi.id, 'cold', ii.id, amounts.qty
from (values
  ('16oz Cup', 1), ('16oz Lid', 1), ('Milk', 40), ('Ground Coffee', 12),
  ('Sugar Syrup', 8)
) as amounts(item_name, qty)
join public.inventory_items ii on ii.name = amounts.item_name
cross join (select id from public.menu_items where name = 'Americano') mi;

-- Americano - Hot
insert into public.recipes (menu_item_id, variant, inventory_item_id, quantity_needed)
select mi.id, 'hot', ii.id, amounts.qty
from (values
  ('12oz Cup', 1), ('12oz Lid', 1), ('Milk', 40), ('Ground Coffee', 12),
  ('Sugar Syrup', 8)
) as amounts(item_name, qty)
join public.inventory_items ii on ii.name = amounts.item_name
cross join (select id from public.menu_items where name = 'Americano') mi;
```

**Step 2: Commit**

```bash
git add supabase/inventory-seed.sql
git commit -m "feat: add inventory seed data with all drink recipes"
```

---

### Task C3: Create API route for inventory deduction on order status change

**Files:**
- Create: `src/app/api/inventory/deduct/route.ts`

**Step 1: Write the deduction API**

When an order moves to "preparing" status, the admin triggers inventory deduction. This API:
1. Accepts an order_id
2. Looks up all order_items and their recipes
3. Deducts inventory for each ingredient
4. Logs each deduction in inventory_log

```tsx
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { order_id } = await request.json()
  if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  // Check if already deducted (prevent double-deduction)
  const { data: existingLog } = await supabase
    .from('inventory_log')
    .select('id')
    .eq('reference_id', order_id)
    .eq('reason', 'order_deduction')
    .limit(1)
  if (existingLog && existingLog.length > 0) {
    return NextResponse.json({ message: 'Already deducted' })
  }

  // Get order items
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('menu_item_id, variant, quantity')
    .eq('order_id', order_id)

  if (!orderItems || orderItems.length === 0) {
    return NextResponse.json({ error: 'No order items found' }, { status: 404 })
  }

  // For each order item, get recipe and deduct
  for (const item of orderItems) {
    const { data: recipe } = await supabase
      .from('recipes')
      .select('inventory_item_id, quantity_needed')
      .eq('menu_item_id', item.menu_item_id)
      .eq('variant', item.variant)

    if (!recipe) continue

    for (const ingredient of recipe) {
      const totalDeduction = ingredient.quantity_needed * item.quantity

      // Deduct from inventory
      const { data: invItem } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', ingredient.inventory_item_id)
        .single()

      if (invItem) {
        await supabase
          .from('inventory_items')
          .update({ current_stock: invItem.current_stock - totalDeduction })
          .eq('id', ingredient.inventory_item_id)
      }

      // Log the deduction
      await supabase.from('inventory_log').insert({
        inventory_item_id: ingredient.inventory_item_id,
        change_amount: -totalDeduction,
        reason: 'order_deduction',
        reference_id: order_id,
      })
    }
  }

  return NextResponse.json({ success: true })
}
```

**Step 2: Commit**

```bash
git add src/app/api/inventory/deduct/route.ts
git commit -m "feat: add inventory deduction API for order processing"
```

---

### Task C4: Auto-deduct inventory when admin advances order to "preparing"

**Files:**
- Modify: `src/components/AdminOrderRow.tsx:16-24`

**Step 1: Update handleAdvance to trigger inventory deduction**

When the admin clicks to advance an order from `pending` to `preparing`, call the deduction API:

```tsx
const handleAdvance = async () => {
  if (!nextStatus) return
  const { error } = await supabase
    .from('orders')
    .update({ status: nextStatus })
    .eq('id', order.id)

  if (!error) {
    setStatus(nextStatus)

    // Auto-deduct inventory when moving to preparing
    if (nextStatus === 'preparing') {
      fetch('/api/inventory/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      })
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/components/AdminOrderRow.tsx
git commit -m "feat: auto-deduct inventory when order moves to preparing"
```

---

## Workstream D: Admin Inventory Management UI

### Task D1: Add inventory page to admin section

**Files:**
- Create: `src/app/admin/inventory/page.tsx`

**Step 1: Build the inventory dashboard page**

This page shows:
- A table/list of all inventory items with current stock levels
- Visual indicators for low stock (red/amber when below threshold)
- A "Restock" button per item to add stock
- A link to recipes page

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface InventoryItem {
  id: string
  name: string
  unit: string
  current_stock: number
  low_stock_threshold: number
}

export default function InventoryPage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [restockAmount, setRestockAmount] = useState('')

  const fetchItems = async () => {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name')
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [supabase])

  const handleRestock = async (itemId: string) => {
    const amount = parseFloat(restockAmount)
    if (isNaN(amount) || amount <= 0) return

    const item = items.find((i) => i.id === itemId)
    if (!item) return

    await supabase
      .from('inventory_items')
      .update({ current_stock: item.current_stock + amount })
      .eq('id', itemId)

    await supabase.from('inventory_log').insert({
      inventory_item_id: itemId,
      change_amount: amount,
      reason: 'restock',
    })

    setRestockId(null)
    setRestockAmount('')
    fetchItems()
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock <= 0) return { color: 'text-red-600 bg-red-50', label: 'Out of stock' }
    if (item.current_stock <= item.low_stock_threshold) return { color: 'text-amber-600 bg-amber-50', label: 'Low stock' }
    return { color: 'text-green-600 bg-green-50', label: 'In stock' }
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Loading inventory...</div>

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-brand-dark">Inventory</h2>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const stock = getStockStatus(item)
          return (
            <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-brand-dark">{item.name}</h3>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {item.current_stock} {item.unit} remaining
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stock.color}`}>
                    {stock.label}
                  </span>
                  <button
                    onClick={() => setRestockId(restockId === item.id ? null : item.id)}
                    className="text-xs text-brand-brown font-medium hover:underline"
                  >
                    Restock
                  </button>
                </div>
              </div>

              {/* Stock bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.current_stock <= 0
                      ? 'bg-red-400 w-0'
                      : item.current_stock <= item.low_stock_threshold
                      ? 'bg-amber-400'
                      : 'bg-green-400'
                  }`}
                  style={{
                    width: `${Math.min(100, (item.current_stock / (item.low_stock_threshold * 5)) * 100)}%`,
                  }}
                />
              </div>

              {restockId === item.id && (
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(e.target.value)}
                    placeholder={`Amount (${item.unit})`}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => handleRestock(item.id)}
                    className="bg-brand-pink-dark text-white px-4 py-1.5 rounded-lg text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/admin/inventory/page.tsx
git commit -m "feat: add admin inventory dashboard with stock levels and restock"
```

---

### Task D2: Add inventory link to admin navigation

**Files:**
- Modify: `src/app/admin/layout.tsx`

**Step 1: Add "Inventory" nav link to admin header**

Add a new nav link alongside "Orders" and "QR Code":

```tsx
// In the nav links section, add:
<Link href="/admin/inventory">Inventory</Link>
```

Place it between "Orders" and "QR Code" in the existing nav.

**Step 2: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "feat: add inventory link to admin navigation"
```

---

### Task D3: Add recipes management page

**Files:**
- Create: `src/app/admin/inventory/recipes/page.tsx`

**Step 1: Build the recipes page**

This page shows each menu item with its recipe (ingredients per variant). Read-only view that helps the admin understand what goes into each drink.

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface RecipeView {
  menu_item_name: string
  variant: string
  ingredients: { name: string; quantity_needed: number; unit: string }[]
}

export default function RecipesPage() {
  const supabase = createClient()
  const [recipes, setRecipes] = useState<RecipeView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecipes = async () => {
      const { data } = await supabase
        .from('recipes')
        .select('variant, quantity_needed, menu_items(name), inventory_items(name, unit)')
        .order('variant')

      if (!data) { setLoading(false); return }

      // Group by menu_item + variant
      const grouped = new Map<string, RecipeView>()
      for (const row of data as any[]) {
        const key = `${row.menu_items.name}-${row.variant}`
        if (!grouped.has(key)) {
          grouped.set(key, {
            menu_item_name: row.menu_items.name,
            variant: row.variant,
            ingredients: [],
          })
        }
        grouped.get(key)!.ingredients.push({
          name: row.inventory_items.name,
          quantity_needed: row.quantity_needed,
          unit: row.inventory_items.unit,
        })
      }

      setRecipes(Array.from(grouped.values()))
      setLoading(false)
    }
    fetchRecipes()
  }, [supabase])

  if (loading) return <div className="p-6 text-center text-gray-400">Loading recipes...</div>

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-brand-dark mb-6">Recipes</h2>

      <div className="space-y-3">
        {recipes.map((recipe) => (
          <div key={`${recipe.menu_item_name}-${recipe.variant}`} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-sm text-brand-dark">{recipe.menu_item_name}</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-light text-brand-dark capitalize">
                {recipe.variant}
              </span>
            </div>
            <div className="space-y-1">
              {recipe.ingredients.map((ing) => (
                <div key={ing.name} className="flex justify-between text-xs text-brand-muted">
                  <span>{ing.name}</span>
                  <span className="font-medium text-brand-dark">
                    {ing.quantity_needed} {ing.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/admin/inventory/recipes/page.tsx
git commit -m "feat: add recipes view page for admin"
```

---

### Task D4: Add TypeScript types for inventory

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add inventory types to the end of the file**

```ts
export interface InventoryItem {
  id: string
  name: string
  unit: string
  current_stock: number
  low_stock_threshold: number
  created_at: string
}

export interface Recipe {
  id: string
  menu_item_id: string
  variant: DrinkVariant
  inventory_item_id: string
  quantity_needed: number
}

export interface InventoryLog {
  id: string
  inventory_item_id: string
  change_amount: number
  reason: 'order_deduction' | 'restock' | 'adjustment'
  reference_id: string | null
  created_at: string
}
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript types for inventory system"
```

---

## Final Task: Build Verification

### Task E1: Full build check

**Step 1: Run the build**

Run: `npx next build`
Expected: Build succeeds with no errors.

**Step 2: Manual test checklist**

- [ ] Home page shows login button and "View Menu" link
- [ ] Logged-in user sees "Start Ordering" button on home
- [ ] Menu page shows drinks with new green theme
- [ ] Cart works with new design, quantities update correctly
- [ ] Orders page updates in realtime when admin changes status
- [ ] Admin can view all orders and advance status
- [ ] Admin inventory page shows stock levels
- [ ] Restocking an item updates the stock count
- [ ] Recipes page shows all drink recipes
- [ ] Order advancing to "preparing" triggers inventory deduction

**Step 3: Deploy**

Run: `npx vercel --prod`

**Step 4: Run the inventory SQL on Supabase**

Execute `supabase/inventory-schema.sql` then `supabase/inventory-seed.sql` in the Supabase SQL editor.

**Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: milestone 2 complete - UX overhaul and inventory system"
```
