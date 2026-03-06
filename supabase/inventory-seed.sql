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
