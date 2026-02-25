-- Migration to add enhance_scraped_image to feeds table
ALTER TABLE public.feeds ADD COLUMN IF NOT EXISTS enhance_scraped_image BOOLEAN DEFAULT FALSE;
