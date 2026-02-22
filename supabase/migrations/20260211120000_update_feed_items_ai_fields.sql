
-- Migration to add social summary and keywords to feed_items
-- Adds columns to support the new structured AI generation format

ALTER TABLE public.feed_items 
ADD COLUMN IF NOT EXISTS keywords TEXT[],
ADD COLUMN IF NOT EXISTS social_summary TEXT;

-- Update RLS policies (though usually not needed for column additions if policy is FOR ALL)
-- Already covered by: CREATE POLICY "Users can manage own feed items" ON public.feed_items FOR ALL USING (auth.uid() = user_id);
