
-- Migration to add rewritten_image to feed_items
-- This column stores the URL of the AI generated or scraped image for the rewritten version

ALTER TABLE public.feed_items 
ADD COLUMN IF NOT EXISTS rewritten_image TEXT;

-- Update types.ts will be done in a separate step
