
-- Migration: SEO and Keyword Infrastructure
-- 1. Make feeds.url nullable to support keyword-based generation
ALTER TABLE public.feeds ALTER COLUMN url DROP NOT NULL;

-- 2. Add SEO and Metadata columns to feed_items if they don't exist
ALTER TABLE public.feed_items 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 3. Ensure organization_id and user_id exist and are indexed for performance
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feed_items' AND COLUMN_NAME='organization_id') THEN
    ALTER TABLE public.feed_items ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feed_items' AND COLUMN_NAME='user_id') THEN
    ALTER TABLE public.feed_items ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 4. Create indexes for the new metadata fields
CREATE INDEX IF NOT EXISTS idx_feed_items_slug ON public.feed_items(slug);
CREATE INDEX IF NOT EXISTS idx_feed_items_organization_id ON public.feed_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_feed_items_user_id ON public.feed_items(user_id);

-- 5. Update RLS (Reinforcement)
DROP POLICY IF EXISTS "Isolamento: feed_items" ON public.feed_items;
CREATE POLICY "Isolamento: feed_items" ON public.feed_items FOR ALL TO authenticated 
USING (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR auth.uid() = user_id
  OR (SELECT is_master FROM public.user_profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR auth.uid() = user_id
  OR (SELECT is_master FROM public.user_profiles WHERE id = auth.uid()) = true
);
