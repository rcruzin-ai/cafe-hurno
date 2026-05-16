# Cafe Hurno - Claude Code Project Instructions

## Stack
- **Framework**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **Database**: Supabase (Postgres + Auth + Realtime + RLS)
- **State**: Zustand (cart store, persisted to localStorage)
- **Hosting**: Vercel (deploy via `npx vercel --prod`)
- **Auth**: Google OAuth via Supabase

## Architecture
- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — Shared React components
- `src/lib/` — Utilities, types, constants, Supabase clients, Zustand stores
- `supabase/` — SQL schema, migrations, seed data, RLS policies
- `public/drinks/` — Local drink images (not external URLs)

## Key Conventions
- All prices are stored in PHP (Philippine Peso), displayed with `₱` symbol
- Order items store price at time of purchase (`order_items.price`), separate from `menu_items.price` — never retroactively change completed order prices
- Coffee vs non-coffee detection: check against `NON_COFFEE_ITEMS` array in relevant components
- Extra shot add-on: `extra_shot` boolean + `add_on_price` numeric on `order_items` table
- Timezone: Philippines (UTC+8) — use `+8 hours` offset when extracting data for local time
- Brand name: "Cafe Hurno" (use accent in display text)

## Roles
- `customer` — default for all signups
- `admin` — can manage orders, inventory, payments
- `super_admin` — admin + can delete orders, edit customer names, void orders
- Role checks: always check `role !== 'admin' && role !== 'super_admin'` (never just `role === 'admin'`)

## Database
- RLS is enabled — use `is_admin()` security definer function to check admin status
- Menu item changes require Supabase SQL Editor (RLS blocks anon key updates)
- `handle_new_user()` trigger auto-assigns roles based on email
- Realtime enabled on `orders` table

## Deployment
- No GitHub Actions CI — deploy manually: `npx vercel --prod`
- Env vars on Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Full Vercel lifecycle (deploy, env vars, logs, rollback) is handled from this terminal — see `.claude/rules/vercel-lifecycle.md` for the playbook, especially gotchas around `Sensitive` env vars showing as empty in `vercel pull` and the need for `--force` after env-var changes.
- Google OAuth redirect: configured in Supabase dashboard
- After adding local assets (images), must redeploy for them to be available in production

## Common Tasks
- **Add menu item**: INSERT via Supabase SQL Editor, add image to `public/drinks/`
- **Change prices**: UPDATE via Supabase SQL Editor (only affects new orders)
- **Add admin**: Update `handle_new_user()` trigger + UPDATE existing profile role
- **Kill stacked dev servers**: `lsof -ti:3000,3001,3002 | xargs kill -9`

## Testing
- Run `npm run build` to check for TypeScript and build errors
- Run `npm run dev` for local development server
- No test suite — manual testing on dev before deploy
