-- Security patch: fix RLS gaps on profiles and feedback

-- Fix 1: Users can only update their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Fix 2: Prevent manual profile inserts — only the handle_new_user trigger should create profiles
-- The trigger runs as security definer so it bypasses this RLS policy (auth.uid() is null during trigger execution)
drop policy if exists "No manual profile inserts" on public.profiles;
create policy "No manual profile inserts"
  on public.profiles for insert
  with check (false);

-- Fix 3: Feedback must reference an order that belongs to the requesting user
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
