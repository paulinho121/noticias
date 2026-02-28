-- Migration to add image_credit to feed_items

ALTER TABLE public.feed_items 
ADD COLUMN IF NOT EXISTS image_credit TEXT;
