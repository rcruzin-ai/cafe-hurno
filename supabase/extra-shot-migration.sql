-- Add extra_shot and add_on_price columns to order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS extra_shot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS add_on_price numeric NOT NULL DEFAULT 0;

-- Update guest order items RPC to include new columns
CREATE OR REPLACE FUNCTION public.create_guest_order_items(
  p_items jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.order_items (order_id, menu_item_id, variant, quantity, price, extra_shot, add_on_price)
  SELECT
    (item->>'order_id')::uuid,
    (item->>'menu_item_id')::uuid,
    item->>'variant',
    (item->>'quantity')::int,
    (item->>'price')::numeric,
    COALESCE((item->>'extra_shot')::boolean, false),
    COALESCE((item->>'add_on_price')::numeric, 0)
  FROM jsonb_array_elements(p_items) AS item;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
