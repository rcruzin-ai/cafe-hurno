-- Milestone 5: Super Admin, Void/Delete, Hot Disable, E-Wallet QR

-- 1. Extend profiles role to include super_admin
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer', 'admin', 'super_admin'));

-- 2. Assign super_admin to raymond.cruzin.ai@gmail.com
update public.profiles
  set role = 'super_admin'
  where email = 'raymond.cruzin.ai@gmail.com';

-- 3. Update the handle_new_user trigger to assign super_admin on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    case
      when new.email = 'raymond.cruzin.ai@gmail.com' then 'super_admin'
      when new.email in (
        'kaye.gallaga@gmail.com',
        'cruzinrhea@gmail.com',
        'jonallynecruzin@gmail.com'
      ) then 'admin'
      else 'customer'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- 4. Add voided status to orders
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'preparing', 'ready', 'completed', 'voided'));

-- 5. Add hot_available column to menu_items (default false = hot disabled)
alter table public.menu_items
  add column if not exists hot_available boolean not null default false;

-- 6. Update is_admin() helper to also return true for super_admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'super_admin')
  );
end;
$$ language plpgsql security definer;

-- 7. RLS: super_admin can delete orders
create policy "Super admins can delete orders"
  on public.orders for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'super_admin'
    )
  );
