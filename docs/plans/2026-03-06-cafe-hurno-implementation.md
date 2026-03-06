# Cafe Hurno Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first coffee ordering app with menu display, cart, order tracking, feedback, admin dashboard, QR code generation, and Google auth — deployed free on Vercel + Supabase.

**Architecture:** Next.js 14 App Router frontend hosted on Vercel. Supabase provides Postgres database, Google OAuth authentication, and Realtime subscriptions for live order tracking. No custom backend server.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (DB + Auth + Realtime), Zustand (cart state), qrcode.react, Vercel

**CRITICAL:** Do NOT commit or push to any git repo at any point during implementation.

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json` (via npx)
- Create: `.env.local.example`
- Create: `.gitignore`
- Create: `.vscode/extensions.json`
- Create: `tailwind.config.ts`

**Step 1: Initialize Next.js project**

Run from `/Users/RCruzin/Documents/cafe-hurno`:

```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults for all prompts. This creates the full Next.js scaffold in the current directory.

**Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr zustand qrcode.react
npm install -D @types/qrcode.react
```

**Step 3: Create `.env.local.example`**

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Step 4: Create `.vscode/extensions.json`**

```json
{
  "recommendations": [
    "ms-vscode.live-server"
  ]
}
```

**Step 5: Verify dev server starts**

Run: `npm run dev`
Expected: Next.js dev server running on http://localhost:3000

---

### Task 2: Supabase Project Setup & Database Schema

**Files:**
- Create: `supabase/schema.sql`
- Create: `supabase/seed.sql`
- Create: `supabase/rls-policies.sql`

**Step 1: Create Supabase project**

Go to https://supabase.com/dashboard and create a new project called "cafe-hurno". Save the project URL and anon key.

**Step 2: Write the full database schema**

Create `supabase/schema.sql`:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (synced from auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    case when new.email = 'raymond.cruzin.ai@gmail.com' then 'admin' else 'customer' end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Menu items
create table public.menu_items (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  image_url text,
  price numeric not null default 70,
  hot_size_oz int not null default 12,
  cold_size_oz int not null default 16,
  available boolean not null default true,
  created_at timestamptz default now()
);

-- Orders
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'preparing', 'ready', 'completed')),
  total numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Order items
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  menu_item_id uuid references public.menu_items(id) not null,
  variant text not null check (variant in ('hot', 'cold')),
  quantity int not null default 1,
  price numeric not null
);

-- Feedback
create table public.feedback (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

-- Auto-update updated_at on orders
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at();

-- Enable realtime on orders table
alter publication supabase_realtime add table public.orders;
```

**Step 3: Write seed data**

Create `supabase/seed.sql`:

```sql
insert into public.menu_items (name, description, image_url, price, hot_size_oz, cold_size_oz) values
  ('Spanish Latte', 'A creamy blend of espresso and sweetened condensed milk', '/images/spanish-latte.jpg', 70, 12, 16),
  ('Latte', 'Smooth espresso with steamed milk', '/images/latte.jpg', 70, 12, 16),
  ('Cappuccino', 'Bold espresso topped with thick, velvety foam', '/images/cappuccino.jpg', 70, 12, 16),
  ('Americano', 'Rich espresso diluted with hot water for a clean finish', '/images/americano.jpg', 70, 12, 16);
```

**Step 4: Write RLS policies**

Create `supabase/rls-policies.sql`:

```sql
-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.feedback enable row level security;

-- Profiles: users can read their own, admins can read all
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Menu items: anyone can read
create policy "Anyone can view menu items"
  on public.menu_items for select
  using (true);

-- Orders: customers see own, admins see all
create policy "Customers can view own orders"
  on public.orders for select
  using (auth.uid() = customer_id);

create policy "Admins can view all orders"
  on public.orders for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Customers can insert own orders"
  on public.orders for insert
  with check (auth.uid() = customer_id);

create policy "Admins can update any order"
  on public.orders for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Order items: follow parent order visibility
create policy "Customers can view own order items"
  on public.order_items for select
  using (
    exists (select 1 from public.orders where id = order_id and customer_id = auth.uid())
  );

create policy "Admins can view all order items"
  on public.order_items for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Customers can insert own order items"
  on public.order_items for insert
  with check (
    exists (select 1 from public.orders where id = order_id and customer_id = auth.uid())
  );

-- Feedback: customers can create for own orders, admins can read all
create policy "Customers can insert own feedback"
  on public.feedback for insert
  with check (auth.uid() = customer_id);

create policy "Customers can view own feedback"
  on public.feedback for select
  using (auth.uid() = customer_id);

create policy "Admins can view all feedback"
  on public.feedback for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

**Step 5: Run all SQL in Supabase dashboard**

Go to Supabase SQL Editor. Run `schema.sql`, then `rls-policies.sql`, then `seed.sql` in that order. Verify 4 menu items appear in the menu_items table.

**Step 6: Configure Google OAuth in Supabase**

In Supabase Dashboard > Authentication > Providers > Google:
- Enable Google provider
- Create OAuth credentials at https://console.cloud.google.com/apis/credentials
- Set authorized redirect URI to `https://<your-project>.supabase.co/auth/v1/callback`
- Paste Client ID and Client Secret into Supabase

**Step 7: Set environment variables**

Create `.env.local` with actual Supabase URL and anon key from the dashboard.

---

### Task 3: Supabase Client Setup

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`

**Step 1: Create browser client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: Create server client**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  )
}
```

**Step 3: Create middleware helper**

Create `src/lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}
```

**Step 4: Create middleware**

Create `src/middleware.ts`:

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 5: Verify dev server still runs**

Run: `npm run dev`
Expected: No errors, server starts on port 3000

---

### Task 4: Database Types & Shared Utilities

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/constants.ts`

**Step 1: Create TypeScript types**

Create `src/lib/types.ts`:

```typescript
export type UserRole = 'customer' | 'admin'
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed'
export type DrinkVariant = 'hot' | 'cold'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
}

export interface MenuItem {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price: number
  hot_size_oz: number
  cold_size_oz: number
  available: boolean
  created_at: string
}

export interface Order {
  id: string
  customer_id: string
  status: OrderStatus
  total: number
  created_at: string
  updated_at: string
}

export interface OrderWithItems extends Order {
  order_items: OrderItemWithMenu[]
  profiles?: Profile
  feedback?: Feedback[]
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  variant: DrinkVariant
  quantity: number
  price: number
}

export interface OrderItemWithMenu extends OrderItem {
  menu_items: MenuItem
}

export interface Feedback {
  id: string
  order_id: string
  customer_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface CartItem {
  menuItem: MenuItem
  variant: DrinkVariant
  quantity: number
}
```

**Step 2: Create constants**

Create `src/lib/constants.ts`:

```typescript
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
}

export const ADMIN_EMAIL = 'raymond.cruzin.ai@gmail.com'
```

---

### Task 5: Cart Store (Zustand)

**Files:**
- Create: `src/lib/store/cart.ts`

**Step 1: Create cart store**

Create `src/lib/store/cart.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, MenuItem, DrinkVariant } from '@/lib/types'

interface CartStore {
  items: CartItem[]
  addItem: (menuItem: MenuItem, variant: DrinkVariant) => void
  removeItem: (menuItemId: string, variant: DrinkVariant) => void
  updateQuantity: (menuItemId: string, variant: DrinkVariant, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (menuItem, variant) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.menuItem.id === menuItem.id && i.variant === variant
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.menuItem.id === menuItem.id && i.variant === variant
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }
          return { items: [...state.items, { menuItem, variant, quantity: 1 }] }
        })
      },

      removeItem: (menuItemId, variant) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.menuItem.id === menuItemId && i.variant === variant)
          ),
        }))
      },

      updateQuantity: (menuItemId, variant, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId, variant)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.menuItem.id === menuItemId && i.variant === variant
              ? { ...i, quantity }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        return get().items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0)
      },

      getItemCount: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },
    }),
    { name: 'cafe-hurno-cart' }
  )
)
```

---

### Task 6: Global Layout, Theme & Navigation

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/globals.css` (modify existing)
- Create: `src/components/BottomNav.tsx`
- Create: `src/components/AuthButton.tsx`
- Move: `images/logo.png` to `public/images/logo.png`

**Step 1: Copy images to public folder**

```bash
mkdir -p public/images
cp images/logo.png public/images/logo.png
```

Also add placeholder coffee images (we'll use Unsplash URLs in seed data or simple colored placeholders).

**Step 2: Update globals.css**

Replace `src/app/globals.css` with the Cafe Hurno theme:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brown-dark: #5C3D2E;
  --brown-medium: #8B4513;
  --brown-accent: #D2691E;
  --cream: #FFF8DC;
  --dark-bg: #1a1a1a;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: #FFF8DC;
  color: #1a1a1a;
  min-height: 100dvh;
}

/* Hide scrollbar for bottom nav spacing */
main {
  padding-bottom: 5rem;
}
```

**Step 3: Update tailwind.config.ts**

Add custom colors to `tailwind.config.ts` theme extend:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#5C3D2E',
          brown: '#8B4513',
          accent: '#D2691E',
          cream: '#FFF8DC',
          hero: '#1a1a1a',
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

**Step 4: Create BottomNav component**

Create `src/components/BottomNav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/menu', label: 'Menu', icon: '☕' },
  { href: '/cart', label: 'Cart', icon: '🛒' },
  { href: '/orders', label: 'Orders', icon: '📋' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()

  // Hide on admin pages and landing
  if (pathname === '/' || pathname.startsWith('/admin')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 text-xs ${
                isActive ? 'text-brand-brown font-semibold' : 'text-gray-500'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

**Step 5: Create AuthButton component**

Create `src/components/AuthButton.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export default function AuthButton() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  if (user) {
    return (
      <button
        onClick={handleLogout}
        className="text-sm text-brand-brown underline"
      >
        Sign Out
      </button>
    )
  }

  return (
    <button
      onClick={handleLogin}
      className="bg-brand-brown text-white px-4 py-2 rounded-full text-sm font-medium"
    >
      Sign in with Google
    </button>
  )
}
```

**Step 6: Create auth callback route**

Create `src/app/auth/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/menu'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

**Step 7: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cafe Hurno",
  description: "Cozy coffee corner for all coffee lovers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen max-w-md mx-auto">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
```

**Step 8: Verify**

Run: `npm run dev`
Expected: App loads with cream background, Inter font, bottom nav visible on /menu

---

### Task 7: Landing Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Build the landing page**

Replace `src/app/page.tsx`:

```tsx
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
```

**Step 2: Verify**

Run: `npm run dev`, visit http://localhost:3000
Expected: Dark hero page with Cafe Hurno logo, tagline, and orange "Get Started" button

---

### Task 8: Menu Page

**Files:**
- Create: `src/app/menu/page.tsx`
- Create: `src/components/MenuCard.tsx`

**Step 1: Create MenuCard component**

Create `src/components/MenuCard.tsx`:

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

  const sizeLabel = variant === 'hot' ? `${item.hot_size_oz}oz` : `${item.cold_size_oz}oz`

  const handleAdd = () => {
    addItem(item, variant)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="relative h-40 bg-brand-hero">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl">☕</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-brand-dark">{item.name}</h3>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>

        {/* Variant toggle */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setVariant('hot')}
            className={`flex-1 text-xs py-1.5 rounded-full font-medium transition ${
              variant === 'hot'
                ? 'bg-brand-brown text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Hot ({item.hot_size_oz}oz)
          </button>
          <button
            onClick={() => setVariant('cold')}
            className={`flex-1 text-xs py-1.5 rounded-full font-medium transition ${
              variant === 'cold'
                ? 'bg-brand-brown text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Cold ({item.cold_size_oz}oz)
          </button>
        </div>

        {/* Price & Add */}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-brand-brown">₱{item.price}</span>
          <button
            onClick={handleAdd}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
              added
                ? 'bg-green-500 text-white'
                : 'bg-brand-accent text-white hover:bg-brand-brown'
            }`}
          >
            {added ? 'Added!' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Create menu page**

Create `src/app/menu/page.tsx`:

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
      <h1 className="text-2xl font-bold text-brand-dark mb-1">Our Menu</h1>
      <p className="text-sm text-gray-500 mb-6">Choose your favorite brew</p>

      <div className="grid grid-cols-2 gap-3">
        {(items as MenuItem[] || []).map((item) => (
          <MenuCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Verify**

Run: `npm run dev`, visit http://localhost:3000/menu
Expected: 2-column grid of 4 coffee cards with hot/cold toggle and Add to Cart buttons

---

### Task 9: Cart Page & Order Placement

**Files:**
- Create: `src/app/cart/page.tsx`
- Create: `src/components/CartItemRow.tsx`
- Create: `src/app/api/orders/route.ts`

**Step 1: Create CartItemRow component**

Create `src/components/CartItemRow.tsx`:

```tsx
'use client'

import { useCartStore } from '@/lib/store/cart'
import type { CartItem } from '@/lib/types'

export default function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-brand-hero flex items-center justify-center text-lg">
        ☕
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-brand-dark truncate">{item.menuItem.name}</p>
        <p className="text-xs text-gray-500 capitalize">
          {item.variant} &middot; {item.variant === 'hot' ? item.menuItem.hot_size_oz : item.menuItem.cold_size_oz}oz
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(item.menuItem.id, item.variant, item.quantity - 1)}
          className="w-7 h-7 rounded-full bg-gray-100 text-sm font-bold"
        >
          -
        </button>
        <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.menuItem.id, item.variant, item.quantity + 1)}
          className="w-7 h-7 rounded-full bg-gray-100 text-sm font-bold"
        >
          +
        </button>
      </div>
      <span className="text-sm font-bold text-brand-brown w-12 text-right">
        ₱{item.menuItem.price * item.quantity}
      </span>
    </div>
  )
}
```

**Step 2: Create order API route**

Create `src/app/api/orders/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { items } = await request.json()

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const total = items.reduce(
    (sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity,
    0
  )

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ customer_id: user.id, total, status: 'pending' })
    .select()
    .single()

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  // Create order items
  const orderItems = items.map((i: { menu_item_id: string; variant: string; quantity: number; price: number }) => ({
    order_id: order.id,
    menu_item_id: i.menu_item_id,
    variant: i.variant,
    quantity: i.quantity,
    price: i.price,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ order })
}
```

**Step 3: Create cart page**

Create `src/app/cart/page.tsx`:

```tsx
'use client'

import { useCartStore } from '@/lib/store/cart'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import CartItemRow from '@/components/CartItemRow'
import type { User } from '@supabase/supabase-js'

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const getTotal = useCartStore((s) => s.getTotal)
  const clearCart = useCartStore((s) => s.clearCart)
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [supabase])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/cart` },
    })
  }

  const handlePlaceOrder = async () => {
    if (!user) return handleLogin()
    setLoading(true)

    const orderItems = items.map((i) => ({
      menu_item_id: i.menuItem.id,
      variant: i.variant,
      quantity: i.quantity,
      price: i.menuItem.price,
    }))

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: orderItems }),
    })

    const data = await res.json()
    setLoading(false)

    if (data.order) {
      setOrderId(data.order.id)
      clearCart()
    }
  }

  if (orderId) {
    return <OrderSuccess orderId={orderId} />
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-dark mb-4">Your Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p>Your cart is empty</p>
          <button
            onClick={() => router.push('/menu')}
            className="mt-4 text-brand-brown underline text-sm"
          >
            Browse menu
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <CartItemRow
                key={`${item.menuItem.id}-${item.variant}`}
                item={item}
              />
            ))}
          </div>

          <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-lg text-brand-dark">₱{getTotal()}</span>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full bg-brand-accent text-white py-3 rounded-full font-semibold hover:bg-brand-brown transition disabled:opacity-50"
            >
              {loading ? 'Placing Order...' : user ? 'Place Order' : 'Sign in to Order'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function OrderSuccess({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleFeedback = async () => {
    if (rating === 0) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('feedback').insert({
      order_id: orderId,
      customer_id: user.id,
      rating,
      comment: comment || null,
    })
    setSubmitted(true)
  }

  return (
    <div className="px-4 py-6 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-xl font-bold text-brand-dark mb-2">Order Placed!</h2>
      <p className="text-sm text-gray-500 mb-6">Your order is being prepared</p>

      {/* Feedback form */}
      {!submitted ? (
        <div className="bg-white rounded-xl p-4 shadow-sm text-left mt-6">
          <h3 className="font-semibold text-brand-dark mb-3">How was your experience?</h3>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any comments? (optional)"
            className="w-full border rounded-lg p-2 text-sm mb-3 resize-none h-20"
          />
          <button
            onClick={handleFeedback}
            disabled={rating === 0}
            className="w-full bg-brand-accent text-white py-2 rounded-full text-sm font-medium disabled:opacity-50"
          >
            Submit Feedback
          </button>
        </div>
      ) : (
        <p className="text-sm text-green-600 mt-4">Thanks for your feedback!</p>
      )}

      <button
        onClick={() => router.push('/orders')}
        className="mt-6 text-brand-brown underline text-sm"
      >
        Track your order →
      </button>
    </div>
  )
}
```

**Step 4: Verify**

Run: `npm run dev`
Expected: Cart page shows items, place order flow works, feedback form shows after ordering

---

### Task 10: Orders Page (Customer - Realtime)

**Files:**
- Create: `src/app/orders/page.tsx`
- Create: `src/components/OrderCard.tsx`

**Step 1: Create OrderCard component**

Create `src/components/OrderCard.tsx`:

```tsx
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/constants'
import type { OrderWithItems } from '@/lib/types'

export default function OrderCard({ order }: { order: OrderWithItems }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">
          {new Date(order.created_at).toLocaleString()}
        </span>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="space-y-1.5">
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.menu_items?.name}
              <span className="text-gray-400 ml-1 capitalize text-xs">({item.variant})</span>
              <span className="text-gray-400 ml-1">x{item.quantity}</span>
            </span>
            <span className="text-brand-dark font-medium">₱{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="border-t mt-3 pt-2 flex justify-between">
        <span className="text-sm text-gray-500">Total</span>
        <span className="font-bold text-brand-brown">₱{order.total}</span>
      </div>
    </div>
  )
}
```

**Step 2: Create orders page with realtime**

Create `src/app/orders/page.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import OrderCard from '@/components/OrderCard'
import type { OrderWithItems } from '@/lib/types'

export default function OrdersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/menu')
        return
      }

      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(*))')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      setOrders((data as OrderWithItems[]) || [])
      setLoading(false)

      // Subscribe to realtime updates
      const channel = supabase
        .channel('my-orders')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `customer_id=eq.${user.id}`,
          },
          (payload) => {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === payload.new.id ? { ...o, ...payload.new } : o
              )
            )
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    fetchOrders()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading orders...</div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-dark mb-4">Your Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Verify**

Run: `npm run dev`, visit http://localhost:3000/orders
Expected: Shows customer's orders with realtime status updates

---

### Task 11: Profile Page

**Files:**
- Create: `src/app/profile/page.tsx`

**Step 1: Create profile page**

Create `src/app/profile/page.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { Profile } from '@/lib/types'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data as Profile)
      setLoading(false)
    }
    fetchProfile()
  }, [supabase])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/profile` },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Loading...</div>

  if (!profile) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-4xl mb-4">👤</p>
        <p className="text-gray-500 mb-4">Sign in to view your profile</p>
        <button onClick={handleLogin} className="bg-brand-brown text-white px-6 py-2 rounded-full text-sm font-medium">
          Sign in with Google
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="bg-white rounded-xl p-6 shadow-sm text-center">
        {profile.avatar_url && (
          <Image
            src={profile.avatar_url}
            alt={profile.full_name || ''}
            width={80}
            height={80}
            className="rounded-full mx-auto mb-3"
          />
        )}
        <h2 className="font-bold text-brand-dark">{profile.full_name}</h2>
        <p className="text-sm text-gray-500">{profile.email}</p>
        <span className="inline-block mt-2 text-xs bg-brand-cream text-brand-brown px-3 py-1 rounded-full capitalize">
          {profile.role}
        </span>

        {profile.role === 'admin' && (
          <button
            onClick={() => router.push('/admin')}
            className="mt-4 w-full bg-brand-dark text-white py-2 rounded-full text-sm font-medium"
          >
            Admin Dashboard
          </button>
        )}

        <button
          onClick={handleLogout}
          className="mt-3 w-full border border-gray-200 text-gray-500 py-2 rounded-full text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Verify**

Visit /profile — should show login prompt or profile card with admin link for raymond.cruzin.ai@gmail.com

---

### Task 12: Admin Dashboard

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/AdminOrderRow.tsx`

**Step 1: Create admin layout with auth guard**

Create `src/app/admin/layout.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/lib/types'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/menu')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if ((profile as Profile)?.role !== 'admin') redirect('/menu')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-dark text-white px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold">Cafe Hurno Admin</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/admin" className="hover:text-brand-accent">Orders</Link>
          <Link href="/admin/qr" className="hover:text-brand-accent">QR Code</Link>
          <Link href="/profile" className="hover:text-brand-accent">Profile</Link>
        </div>
      </header>
      <div className="max-w-2xl mx-auto">{children}</div>
    </div>
  )
}
```

**Step 2: Create AdminOrderRow component**

Create `src/components/AdminOrderRow.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/constants'
import type { OrderWithItems, OrderStatus } from '@/lib/types'
import { useState } from 'react'

const STATUS_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed']

export default function AdminOrderRow({ order }: { order: OrderWithItems }) {
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const supabase = createClient()

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1] || null

  const handleAdvance = async () => {
    if (!nextStatus) return
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', order.id)

    if (!error) setStatus(nextStatus)
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-brand-dark">
            {order.profiles?.full_name || order.profiles?.email || 'Customer'}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${ORDER_STATUS_COLORS[status]}`}>
          {ORDER_STATUS_LABELS[status]}
        </span>
      </div>

      <div className="space-y-1 text-sm mb-3">
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex justify-between text-gray-600">
            <span>
              {item.menu_items?.name}
              <span className="text-gray-400 ml-1 capitalize text-xs">({item.variant})</span>
              <span className="text-gray-400 ml-1">x{item.quantity}</span>
            </span>
            <span>₱{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t pt-2">
        <span className="font-bold text-brand-brown">₱{order.total}</span>
        {nextStatus && (
          <button
            onClick={handleAdvance}
            className="bg-brand-accent text-white px-4 py-1.5 rounded-full text-xs font-medium hover:bg-brand-brown transition"
          >
            Mark as {ORDER_STATUS_LABELS[nextStatus]}
          </button>
        )}
      </div>

      {/* Show feedback if any */}
      {order.feedback && order.feedback.length > 0 && (
        <div className="mt-3 border-t pt-2">
          {order.feedback.map((fb) => (
            <div key={fb.id} className="text-xs text-gray-500">
              <span className="text-yellow-400">{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>
              {fb.comment && <span className="ml-2">{fb.comment}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create admin orders page with realtime**

Create `src/app/admin/page.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import AdminOrderRow from '@/components/AdminOrderRow'
import type { OrderWithItems, OrderStatus } from '@/lib/types'
import { ORDER_STATUS_LABELS } from '@/lib/constants'

const FILTERS: (OrderStatus | 'all')[] = ['all', 'pending', 'preparing', 'ready', 'completed']

export default function AdminPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(*)), profiles(*), feedback(*)')
        .order('created_at', { ascending: false })

      setOrders((data as OrderWithItems[]) || [])
      setLoading(false)
    }
    fetchOrders()

    // Realtime for new and updated orders
    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async () => {
          // Refetch all orders on any change
          const { data } = await supabase
            .from('orders')
            .select('*, order_items(*, menu_items(*)), profiles(*), feedback(*)')
            .order('created_at', { ascending: false })
          setOrders((data as OrderWithItems[]) || [])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  if (loading) return <div className="p-6 text-center text-gray-400">Loading orders...</div>

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-brand-dark mb-4">
        Orders ({orders.length})
      </h2>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
              filter === f
                ? 'bg-brand-brown text-white'
                : 'bg-white text-gray-600 border'
            }`}
          >
            {f === 'all' ? 'All' : ORDER_STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">No orders</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <AdminOrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Verify**

Sign in as raymond.cruzin.ai@gmail.com, visit /admin
Expected: All orders visible with status filters and "Mark as" buttons

---

### Task 13: QR Code Generator Page

**Files:**
- Create: `src/app/admin/qr/page.tsx`

**Step 1: Create QR code page**

Create `src/app/admin/qr/page.tsx`:

```tsx
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
        className="mt-6 bg-brand-accent text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-brand-brown transition"
      >
        Download QR Code
      </button>
    </div>
  )
}
```

**Step 2: Verify**

Visit /admin/qr — should show QR code with Cafe Hurno logo embedded, downloadable as PNG

---

### Task 14: Coffee Images & Polish

**Files:**
- Create: `public/images/spanish-latte.jpg` (placeholder)
- Create: `public/images/latte.jpg` (placeholder)
- Create: `public/images/cappuccino.jpg` (placeholder)
- Create: `public/images/americano.jpg` (placeholder)
- Modify: `next.config.mjs` (allow external images)

**Step 1: Configure next.config for external images**

Update `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default nextConfig
```

**Step 2: Update seed data to use Unsplash URLs**

Update `supabase/seed.sql` image_url values to use royalty-free Unsplash coffee images (or keep as local paths and add simple placeholder images).

**Step 3: Verify all pages render correctly**

Visit each page: /, /menu, /cart, /orders, /profile, /admin, /admin/qr
Expected: All pages render with warm brown theme, mobile-optimized layout

---

### Task 15: Vercel Deployment

**Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

**Step 2: Deploy**

```bash
cd /Users/RCruzin/Documents/cafe-hurno
vercel
```

Follow prompts:
- Set up and deploy? Y
- Which scope? (select your account)
- Link to existing project? N
- Project name: cafe-hurno
- Directory with code: ./
- Override settings? N

**Step 3: Set environment variables**

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Paste the values from `.env.local`.

**Step 4: Redeploy with env vars**

```bash
vercel --prod
```

**Step 5: Update Supabase OAuth redirect**

In Supabase Dashboard > Authentication > URL Configuration:
- Add `https://cafe-hurno.vercel.app` to Redirect URLs
- Add `https://cafe-hurno.vercel.app/auth/callback` to Redirect URLs

In Google Cloud Console OAuth settings:
- Add `https://cafe-hurno.vercel.app` to authorized origins
- Add `https://<your-project>.supabase.co/auth/v1/callback` to authorized redirect URIs

**Step 6: Verify production deployment**

Visit https://cafe-hurno.vercel.app
Expected: Full app working — landing page, menu, cart, orders, admin, QR code

---

### Task 16: Final Verification

**Step 1: Test complete customer flow**

1. Visit landing page → click Get Started
2. Browse menu → add drinks to cart
3. Go to cart → sign in with Google → place order
4. See order success → submit feedback
5. Go to orders → see order with realtime status

**Step 2: Test admin flow**

1. Sign in as raymond.cruzin.ai@gmail.com
2. Go to profile → click Admin Dashboard
3. See all orders → filter by status
4. Click "Mark as Preparing" → verify customer sees update in realtime
5. Go to QR Code → download PNG

**Step 3: Test mobile responsiveness**

Open Chrome DevTools → toggle device toolbar → test on iPhone SE, iPhone 14, Pixel 7
Expected: All pages look good at 375px+ width with bottom navigation
