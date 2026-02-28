
-- Migration: Fix Feed Table Schema Final
-- Adds missing columns that are being sent by the frontend but don't exist in the DB

DO $$ 
BEGIN
  -- 1. AI & Editorial Columns
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='custom_prompt') THEN
    ALTER TABLE public.feeds ADD COLUMN custom_prompt TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='is_pending_review') THEN
    ALTER TABLE public.feeds ADD COLUMN is_pending_review BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='source_type') THEN
    ALTER TABLE public.feeds ADD COLUMN source_type TEXT DEFAULT 'rss';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='keywords') THEN
    ALTER TABLE public.feeds ADD COLUMN keywords TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='image_engine') THEN
    ALTER TABLE public.feeds ADD COLUMN image_engine TEXT DEFAULT 'scraped';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='generate_highlights') THEN
    ALTER TABLE public.feeds ADD COLUMN generate_highlights BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='credit_source') THEN
    ALTER TABLE public.feeds ADD COLUMN credit_source BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='image_credit_text') THEN
    ALTER TABLE public.feeds ADD COLUMN image_credit_text TEXT;
  END IF;

  -- 2. Authorship & Metadata
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='user_id') THEN
    ALTER TABLE public.feeds ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;

  -- 3. Ensure target_platform exists (reinforcement)
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='target_platform') THEN
    ALTER TABLE public.feeds ADD COLUMN target_platform TEXT DEFAULT 'wordpress';
  END IF;

  -- 4. Ensure include_source_link exists
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='include_source_link') THEN
    ALTER TABLE public.feeds ADD COLUMN include_source_link BOOLEAN DEFAULT false;
  END IF;

  -- 5. Ensure enhance_scraped_image exists
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='enhance_scraped_image') THEN
    ALTER TABLE public.feeds ADD COLUMN enhance_scraped_image BOOLEAN DEFAULT false;
  END IF;

  -- 6. Ensure url is nullable for keywords mode
  ALTER TABLE public.feeds ALTER COLUMN url DROP NOT NULL;

END $$;

-- 7. Update RLS (Reinforcement for the new columns and nuclear isolation)
DROP POLICY IF EXISTS "Isolamento: feeds" ON public.feeds;
CREATE POLICY "Isolamento: feeds" ON public.feeds FOR ALL TO authenticated 
USING (
  organization_id IS NOT DISTINCT FROM public.get_my_organization_strict() 
  OR auth.uid() = user_id
  OR public.is_master_admin()
)
WITH CHECK (
  organization_id IS NOT DISTINCT FROM public.get_my_organization_strict() 
  OR auth.uid() = user_id
  OR public.is_master_admin()
);
