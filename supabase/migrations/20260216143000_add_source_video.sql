-- Add source_video column to feed_items
ALTER TABLE public.feed_items ADD COLUMN IF NOT EXISTS source_video TEXT;

-- Update the type in the system (this is helpful for documentation)
COMMENT ON COLUMN public.feed_items.source_video IS 'URL of the original video found in the RSS feed or source page';
