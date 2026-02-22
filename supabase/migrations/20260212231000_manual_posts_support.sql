
-- ========================================================
-- MANUAL POSTS SUPPORT & AUTHORSHIP TRACKING
-- ========================================================

-- 1. Add user_id to business tables for authorship and audit
DO $$ 
BEGIN
  -- feed_items
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feed_items' AND COLUMN_NAME='user_id') THEN
    ALTER TABLE public.feed_items ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;

  -- logs
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='logs' AND COLUMN_NAME='user_id') THEN
    ALTER TABLE public.logs ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 2. Make feed_id optional in feed_items (to support posts without an RSS source)
ALTER TABLE public.feed_items ALTER COLUMN feed_id DROP NOT NULL;

-- 3. Update RLS policies to include user_id check (Author parity)
-- This allows journalists to see/edit their own posts even if they move orgs (optional, but standard for authoring)
-- But primarily it ensures that user_id is respected in audits.

-- Already handled in 20260211110000_fix_feeds_rls.sql, but let's reinforce it
-- to ensure journalists can also manage their own manual items.

DROP POLICY IF EXISTS "Isolamento: feed_items" ON public.feed_items;
CREATE POLICY "Isolamento: feed_items" ON public.feed_items FOR ALL TO authenticated 
USING (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR auth.uid() = user_id
  OR public.is_master_admin()
)
WITH CHECK (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR auth.uid() = user_id
  OR public.is_master_admin()
);

-- Similarly for logs
DROP POLICY IF EXISTS "Isolamento: logs" ON public.logs;
CREATE POLICY "Isolamento: logs" ON public.logs FOR ALL TO authenticated 
USING (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR auth.uid() = user_id
  OR public.is_master_admin()
)
WITH CHECK (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR auth.uid() = user_id
  OR public.is_master_admin()
);
