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
