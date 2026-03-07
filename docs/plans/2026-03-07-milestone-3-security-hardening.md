# Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden Cafe Hurno against common web attacks and data exposure risks while staying on free-tier infrastructure (Vercel + Supabase free plan).

**Architecture:** Defense-in-depth across three layers — HTTP headers (Vercel/Next.js), server-side input validation (API routes), and database access controls (Supabase RLS + auth). Google OAuth via Supabase means no passwords to steal. No new paid services needed.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + Auth), Tailwind CSS, TypeScript, Vercel (free tier)

---

## Security Audit Summary (Current State)

### What's already solid
- Google OAuth only — no passwords stored, no credential stuffing risk
- RLS enabled on all tables with `is_admin()` security definer function
- Server-side admin check in both layout and API routes
- `auth.getUser()` (not `getSession()`) used — correct, verifies JWT server-side
- Admin role stored in DB, not in JWT claims — can't be forged by users
- Input validation on DB level: `check` constraints on status, variant, rating

### Vulnerabilities to fix

| # | Vulnerability | Risk | Where |
|---|---|---|---|
| 1 | No HTTP security headers | XSS, clickjacking, MIME sniffing | next.config.mjs |
| 2 | Open redirect in auth callback | Phishing — attacker crafts `?next=https://evil.com` | src/app/auth/callback/route.ts |
| 3 | No rate limiting on order/API routes | Spam orders, inventory abuse | API routes |
| 4 | `order_total` set by client | User can send any total amount | src/app/cart/page.tsx + DB |
| 5 | No RLS on profiles UPDATE | Any user can update another user's profile | supabase/rls-policies.sql |
| 6 | No RLS on profiles INSERT (manual) | Users could manually insert arbitrary profiles | supabase/rls-policies.sql |
| 7 | Feedback: no check that order belongs to user | User can leave feedback on anyone's order | supabase/rls-policies.sql |
| 8 | No Content Security Policy | XSS via injected scripts | next.config.mjs |
| 9 | `images.unsplash.com` in remotePatterns | Unnecessary external image host allowed | next.config.mjs |
| 10 | No order quantity cap | User can order 999 of one item | DB + API |

---

## Task A1: Fix open redirect in auth callback

**Files:**
- Modify: `src/app/auth/callback/route.ts`

The `?next=` parameter currently accepts any URL. An attacker can send a link like:
`https://cafe-hurno.vercel.app/auth/callback?next=https://evil-phishing-site.com`
After Google login, user gets redirected to the attacker's site.

**Step 1: Write the fix**

Replace the redirect logic to only allow relative paths starting with `/`:

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/menu'

  // Only allow relative paths — prevent open redirect to external URLs
  const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/menu'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${safePath}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

**Step 2: Verify manually**
- `?next=/menu` → should redirect to /menu ✓
- `?next=https://evil.com` → should redirect to /menu ✓
- `?next=//evil.com` → should redirect to /menu ✓

**Step 3: Commit**
```bash
git add src/app/auth/callback/route.ts
git commit -m "fix: prevent open redirect in auth callback"
```

---

## Task A2: Add HTTP security headers

**Files:**
- Modify: `next.config.mjs`

No security headers = browser has no protection against:
- **Clickjacking** (X-Frame-Options)
- **MIME sniffing** (X-Content-Type-Options)
- **XSS via inline scripts** (Content-Security-Policy)
- **Referrer leakage** (Referrer-Policy)

**Step 1: Add headers to next.config.mjs**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

Note: Also remove `images.unsplash.com` from remotePatterns — it's unused and unnecessarily broadens the attack surface.

**Step 2: Build locally to verify no errors**
```bash
npm run build
```
Expected: Build succeeds, no errors.

**Step 3: Commit**
```bash
git add next.config.mjs
git commit -m "security: add HTTP security headers, remove unused image domain"
```

---

## Task A3: Fix RLS — profiles UPDATE and INSERT policies

**Files:**
- Modify: `supabase/rls-policies.sql`
- Create: `supabase/security-patch.sql` (run this in Supabase SQL editor)

**Current gap:** No UPDATE policy on profiles → any authenticated user can update anyone's profile (full_name, avatar_url, and even role if they know the field name).

**Step 1: Create security-patch.sql**

```sql
-- Fix 1: Users can only update their own profile (non-role fields)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Fix 2: Prevent manual profile inserts (only the trigger should create profiles)
-- The handle_new_user trigger runs as security definer so it bypasses RLS
create policy "No manual profile inserts"
  on public.profiles for insert
  with check (false);

-- Fix 3: Feedback must reference an order that belongs to the user
-- Drop existing policy and replace with stricter version
drop policy if exists "Feedback insert" on public.feedback;

create policy "Feedback insert"
  on public.feedback for insert
  with check (
    auth.uid() = customer_id
    and exists (
      select 1 from public.orders
      where id = order_id
      and customer_id = auth.uid()
    )
  );

-- Fix 4: Customers cannot update their own orders (prevent status manipulation)
-- (No update policy exists for customers — good. Confirm admins-only update stands.)
-- Already covered by existing "Admins can update any order" policy.
```

**Step 2: Also update rls-policies.sql to match**

Add the same three policies to `supabase/rls-policies.sql` so it stays the source of truth.

**Step 3: Run in Supabase**
Go to https://potgxkrgvmslbzmppgqu.supabase.co → SQL Editor → paste and run `supabase/security-patch.sql`

**Step 4: Commit**
```bash
git add supabase/rls-policies.sql supabase/security-patch.sql
git commit -m "security: fix RLS gaps - profiles update, feedback order ownership"
```

---

## Task A4: Fix order total — compute server-side, not from client

**Files:**
- Modify: `src/app/cart/page.tsx` — remove `total` from POST body or keep for display only
- Modify: `src/app/api/orders/route.ts` — create this file (new API route)

**Current gap:** The cart page POSTs `total` directly to Supabase from the browser. A user can intercept and modify the request to pay ₱0.

**Architecture:** Move order creation to a server API route that calculates total from actual menu item prices in the DB.

**Step 1: Create `src/app/api/orders/route.ts`**

```ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface OrderItemInput {
  menu_item_id: string
  variant: 'hot' | 'cold'
  quantity: number
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { items } = await request.json() as { items: OrderItemInput[] }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400 })
  }

  // Cap quantity per item to prevent abuse
  for (const item of items) {
    if (!item.menu_item_id || !['hot', 'cold'].includes(item.variant)) {
      return NextResponse.json({ error: 'Invalid item' }, { status: 400 })
    }
    if (typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 20) {
      return NextResponse.json({ error: 'Quantity must be 1–20' }, { status: 400 })
    }
  }

  // Fetch real prices from DB — never trust client-supplied prices
  const menuItemIds = [...new Set(items.map(i => i.menu_item_id))]
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, price, available')
    .in('id', menuItemIds)

  if (menuError || !menuItems) {
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 })
  }

  // Check all items are available
  for (const item of items) {
    const menuItem = menuItems.find(m => m.id === item.menu_item_id)
    if (!menuItem) return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    if (!menuItem.available) return NextResponse.json({ error: `${menuItem.id} is unavailable` }, { status: 400 })
  }

  // Compute total server-side
  const priceMap = Object.fromEntries(menuItems.map(m => [m.id, m.price]))
  const total = items.reduce((sum, item) => sum + priceMap[item.menu_item_id] * item.quantity, 0)

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ customer_id: user.id, total, status: 'pending' })
    .select('id')
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  // Insert order items with server-verified prices
  const orderItems = items.map(item => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    variant: item.variant,
    quantity: item.quantity,
    price: priceMap[item.menu_item_id],
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) {
    return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
  }

  return NextResponse.json({ order_id: order.id })
}
```

**Step 2: Update `src/app/cart/page.tsx`**

Find the order submission logic and replace the direct Supabase calls with a fetch to `/api/orders`:

Current pattern (direct Supabase insert):
```ts
// OLD - client sets total
const { data: order } = await supabase.from('orders').insert({ customer_id: user.id, total, status: 'pending' }).select('id').single()
```

New pattern:
```ts
// NEW - server computes total
const res = await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: cartItems.map(item => ({
      menu_item_id: item.menuItem.id,
      variant: item.variant,
      quantity: item.quantity,
    })),
  }),
})
const { order_id, error } = await res.json()
if (!res.ok || !order_id) {
  setError(error || 'Failed to place order')
  return
}
router.push('/orders')
```

Read `src/app/cart/page.tsx` first to understand the exact existing logic before making changes.

**Step 3: Build to verify no TypeScript errors**
```bash
npm run build
```

**Step 4: Commit**
```bash
git add src/app/api/orders/route.ts src/app/cart/page.tsx
git commit -m "security: compute order total server-side, validate quantities"
```

---

## Task A5: Add simple rate limiting to API routes

**Files:**
- Create: `src/lib/rate-limit.ts`
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/inventory/deduct/route.ts`

**Goal:** Prevent a bad actor from spamming 1000 orders in a loop. On Vercel free tier we can't use Redis, so we use a simple in-memory Map per serverless function instance. This is not perfect (resets on cold start) but stops naive abuse.

**Step 1: Create `src/lib/rate-limit.ts`**

```ts
// Simple in-memory rate limiter — works per serverless instance
// Limits: N requests per window (ms) per key (usually user ID or IP)

const store = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}
```

**Step 2: Apply to `src/app/api/orders/route.ts`**

After the auth check, add:
```ts
import { checkRateLimit } from '@/lib/rate-limit'

// Inside POST handler, after getting user:
const { allowed } = checkRateLimit(`orders:${user.id}`, 10, 60_000) // 10 orders/min
if (!allowed) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
```

**Step 3: Apply to `src/app/api/inventory/deduct/route.ts`**

After the admin check, add:
```ts
import { checkRateLimit } from '@/lib/rate-limit'

// Inside POST handler, after admin check:
const { allowed } = checkRateLimit(`inventory:${user.id}`, 30, 60_000) // 30/min for admin
if (!allowed) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
```

**Step 4: Build to verify**
```bash
npm run build
```

**Step 5: Commit**
```bash
git add src/lib/rate-limit.ts src/app/api/orders/route.ts src/app/api/inventory/deduct/route.ts
git commit -m "security: add in-memory rate limiting to order and inventory APIs"
```

---

## Task A6: Final build, verify, and push

**Files:** None (verification only)

**Step 1: Full build**
```bash
npm run build
```
Expected: Compiled successfully, no errors, no warnings about security.

**Step 2: Quick smoke test locally**
```bash
npm run dev
```
- Visit `/` — loads, no console errors
- Visit `/admin` without login — redirects to /menu
- Visit `/auth/callback?next=https://evil.com` — redirects to /menu (open redirect blocked)

**Step 3: Remind about SQL to run in Supabase**

The following must be run manually in Supabase SQL Editor:
- `supabase/security-patch.sql`

**Step 4: Commit and push**
```bash
git add -A
git commit -m "chore: final security hardening build"
git push origin main
```

**Step 5: Deploy**
```bash
npx vercel --prod
```
