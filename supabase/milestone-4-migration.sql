-- Milestone 4: Admin UX + Guest Orders + Queue + Payments

-- 1. Add new columns to orders
alter table public.orders
  add column if not exists queue_number int,
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid')),
  add column if not exists payment_method text default null
    check (payment_method in (null, 'cash', 'wallet')),
  add column if not exists customer_name text;

-- 2. Queue counter table (single row)
create table if not exists public.queue_counter (
  id int primary key default 1 check (id = 1),
  current_number int not null default 0
);

-- Insert the single row if not exists
insert into public.queue_counter (id, current_number)
  values (1, 0)
  on conflict (id) do nothing;

-- 3. RLS for queue_counter: anyone can read, only admins can update
alter table public.queue_counter enable row level security;

create policy "Anyone can read queue counter"
  on public.queue_counter for select
  using (true);

create policy "Admins can update queue counter"
  on public.queue_counter for update
  using (public.is_admin());

-- 4. Function to get next queue number (atomic increment)
create or replace function public.next_queue_number()
returns int as $$
declare
  next_num int;
begin
  update public.queue_counter
    set current_number = current_number + 1
    where id = 1
    returning current_number into next_num;
  return next_num;
end;
$$ language plpgsql security definer;

-- 5. Guest order creation function (bypasses RLS since guest has no auth)
create or replace function public.create_guest_order(
  p_customer_name text,
  p_total numeric,
  p_queue_number int
)
returns uuid as $$
declare
  new_order_id uuid;
begin
  insert into public.orders (customer_id, customer_name, total, status, queue_number, payment_status)
    values (null, p_customer_name, p_total, 'pending', p_queue_number, 'unpaid')
    returning id into new_order_id;
  return new_order_id;
end;
$$ language plpgsql security definer;

-- 6. Function to insert guest order items (bypasses RLS)
create or replace function public.create_guest_order_items(
  p_items jsonb
)
returns void as $$
begin
  insert into public.order_items (order_id, menu_item_id, variant, quantity, price)
  select
    (item->>'order_id')::uuid,
    (item->>'menu_item_id')::uuid,
    item->>'variant',
    (item->>'quantity')::int,
    (item->>'price')::numeric
  from jsonb_array_elements(p_items) as item;
end;
$$ language plpgsql security definer;

-- 7. Update orders RLS: allow guest orders to be visible
drop policy if exists "Orders select" on public.orders;
create policy "Orders select"
  on public.orders for select
  using (
    auth.uid() = customer_id
    or customer_id is null
    or public.is_admin()
  );

-- 8. Update order_items RLS: allow viewing items of guest orders
drop policy if exists "Order items select" on public.order_items;
create policy "Order items select"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where id = order_id
      and (customer_id = auth.uid() or customer_id is null)
    )
    or public.is_admin()
  );

-- 9. Allow NULL customer_id for guest orders
alter table public.orders alter column customer_id drop not null;

-- 10. Recreate admin update policy (unchanged, just ensuring it exists)
drop policy if exists "Admins can update any order" on public.orders;
create policy "Admins can update any order"
  on public.orders for update
  using (public.is_admin());
