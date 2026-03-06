# Cafe Hurno - Design Document

## Overview

A mobile-first browser app for Cafe Hurno, a small coffee shop. Customers browse the menu, place orders, and leave feedback. Admin/barista tracks and updates order status in real time. Publicly deployed and free to run for 20-100 users.

## Architecture

```
Browser (Mobile-first)
    |
Next.js 14 (App Router) on Vercel
    |
Supabase (Postgres + Auth + Realtime)
```

- **Frontend/Backend:** Next.js 14 with App Router, Tailwind CSS
- **Database:** Supabase Postgres (free tier)
- **Auth:** Supabase Auth with Google OAuth
- **Realtime:** Supabase Realtime subscriptions for order tracking
- **Hosting:** Vercel free tier
- **QR Code:** qrcode.react library

No separate backend server. Supabase handles DB, auth, and realtime.

## Pages & User Flows

### Public (no login required)

- `/` - Landing page with hero image, logo, "Get Started" CTA
- `/menu` - Card-based menu grid showing 4 drinks with hot/cold toggle

### Customer (Google login required)

- `/cart` - Review cart, place order; feedback form appears after order is placed
- `/orders` - View own order status (Pending > Preparing > Ready > Completed)

### Admin/Barista

- `/admin` - Dashboard with all orders, filter by status, click to update status
- `/admin/qr` - Generate and download QR code linking to /menu

## Data Model

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK to auth.users |
| email | text | |
| full_name | text | |
| avatar_url | text | |
| role | text | 'customer' or 'admin' |

### menu_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | e.g. "Spanish Latte" |
| description | text | |
| image_url | text | |
| price | numeric | 70 (flat price) |
| hot_size_oz | int | 12 |
| cold_size_oz | int | 16 |
| available | boolean | |
| created_at | timestamp | |

### orders
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| customer_id | uuid | FK to profiles |
| status | text | pending, preparing, ready, completed |
| total | numeric | |
| created_at | timestamp | |
| updated_at | timestamp | |

### order_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| order_id | uuid | FK to orders |
| menu_item_id | uuid | FK to menu_items |
| variant | text | 'hot' or 'cold' |
| quantity | int | |
| price | numeric | |

### feedback
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| order_id | uuid | FK to orders |
| customer_id | uuid | FK to profiles |
| rating | int | 1-5 |
| comment | text | |
| created_at | timestamp | |

## Auth & Roles

- Google OAuth via Supabase Auth (one-click Gmail login)
- On first login, profiles row created via DB trigger with role = 'customer'
- raymond.cruzin.ai@gmail.com seeded as role = 'admin'
- Row Level Security (RLS) on all tables:
  - Customers: read own orders/feedback only
  - Admins: read all orders, update order status

## Menu & Pricing

| Drink | Hot (12oz) | Cold (16oz) |
|-------|-----------|------------|
| Spanish Latte | P70 | P70 |
| Latte | P70 | P70 |
| Cappuccino | P70 | P70 |
| Americano | P70 | P70 |

All drinks P70 flat regardless of variant.

## Key Features

| Feature | Implementation |
|---------|---------------|
| Menu display | SSR page, card grid, hot/cold toggle with size |
| Cart | Client-side state (zustand), persisted to localStorage |
| Place order | Insert to orders + order_items, requires login |
| Order tracking | Supabase Realtime subscription on orders table |
| Feedback | After order placed, feedback form in cart/order view |
| QR code | qrcode.react, generates QR to /menu, downloadable PNG |
| Admin dashboard | Realtime order list, status updates, filter by status |
| Mobile-first | Tailwind responsive, designed for 375px+ screens |

## Visual Design

- Color palette: Warm browns (#8B4513, #D2691E), cream (#FFF8DC), dark hero (#1a1a1a)
- Matches Cafe Hurno logo and JavaGem Figma template style
- Clean sans-serif typography (Inter)
- Bottom nav on mobile: Menu, Cart, Orders, Profile
- Card-based menu items with coffee imagery

## Deployment

- **Vercel:** Free tier (100GB bandwidth) - *.vercel.app subdomain
- **Supabase:** Free tier (500MB DB, 50K auth users, 2GB bandwidth)
- Both tiers are far beyond what 20-100 users need

## Dev Preview

VSCode Live Preview extension recommended via .vscode/extensions.json for in-editor frontend preview during development.
