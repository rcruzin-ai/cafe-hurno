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
    case
      when new.email in (
        'raymond.cruzin.ai@gmail.com', 
        'kaye.gallaga@gmail.com',
        'cruzinrhea@gmail.com'
      )
      then 'admin'
      else 'customer'
    end
  );
  return new;
end;
$$ language plpgsql security definer;


-- update public.profiles set role = 'admin' where email = 'cruzinrhea@gmail.com';


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
