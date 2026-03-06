-- Helper function to check admin role without triggering RLS recursion
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.feedback enable row level security;

-- Profiles: users can read their own OR admins can read all (single policy, no recursion)
create policy "Profiles select"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- Menu items: anyone can read
create policy "Anyone can view menu items"
  on public.menu_items for select
  using (true);

-- Orders: customers see own, admins see all
create policy "Orders select"
  on public.orders for select
  using (auth.uid() = customer_id or public.is_admin());

create policy "Customers can insert own orders"
  on public.orders for insert
  with check (auth.uid() = customer_id);

create policy "Admins can update any order"
  on public.orders for update
  using (public.is_admin());

-- Order items: follow parent order visibility
create policy "Order items select"
  on public.order_items for select
  using (
    exists (select 1 from public.orders where id = order_id and customer_id = auth.uid())
    or public.is_admin()
  );

create policy "Customers can insert own order items"
  on public.order_items for insert
  with check (
    exists (select 1 from public.orders where id = order_id and customer_id = auth.uid())
  );

-- Feedback
create policy "Feedback insert"
  on public.feedback for insert
  with check (auth.uid() = customer_id);

create policy "Feedback select"
  on public.feedback for select
  using (auth.uid() = customer_id or public.is_admin());
