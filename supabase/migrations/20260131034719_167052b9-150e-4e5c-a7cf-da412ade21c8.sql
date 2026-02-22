-- Create feeds table
CREATE TABLE public.feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category_id TEXT,
  author_id TEXT,
  post_status TEXT NOT NULL DEFAULT 'draft' CHECK (post_status IN ('draft', 'published', 'scheduled')),
  auto_publish BOOLEAN NOT NULL DEFAULT false,
  extract_images BOOLEAN NOT NULL DEFAULT true,
  image_selector TEXT,
  avoid_logo BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create schedules table
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID NOT NULL REFERENCES public.feeds(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL DEFAULT 'interval' CHECK (schedule_type IN ('fixed', 'interval')),
  schedule_time TEXT,
  interval_minutes INTEGER DEFAULT 60,
  days TEXT[] DEFAULT ARRAY['seg', 'ter', 'qua', 'qui', 'sex'],
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feed_items table (fetched RSS items)
CREATE TABLE public.feed_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID NOT NULL REFERENCES public.feeds(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_content TEXT,
  source_image TEXT,
  source_pub_date TIMESTAMP WITH TIME ZONE,
  rewritten_title TEXT,
  rewritten_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'error', 'published')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(feed_id, source_url)
);

-- Create logs table
CREATE TABLE public.logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID REFERENCES public.feeds(id) ON DELETE SET NULL,
  feed_item_id UUID REFERENCES public.feed_items(id) ON DELETE SET NULL,
  source_url TEXT,
  source_title TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'processing', 'pending')),
  step TEXT NOT NULL,
  message TEXT NOT NULL,
  error_details TEXT,
  post_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default categories
INSERT INTO public.categories (name, slug) VALUES
  ('Tecnologia', 'tecnologia'),
  ('Negócios', 'negocios'),
  ('Ciência', 'ciencia'),
  ('Saúde', 'saude'),
  ('Entretenimento', 'entretenimento');

-- Enable RLS on all tables
ALTER TABLE public.feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create public access policies (no auth required for this app)
CREATE POLICY "Public read access for feeds" ON public.feeds FOR SELECT USING (true);
CREATE POLICY "Public insert access for feeds" ON public.feeds FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for feeds" ON public.feeds FOR UPDATE USING (true);
CREATE POLICY "Public delete access for feeds" ON public.feeds FOR DELETE USING (true);

CREATE POLICY "Public read access for schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Public insert access for schedules" ON public.schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for schedules" ON public.schedules FOR UPDATE USING (true);
CREATE POLICY "Public delete access for schedules" ON public.schedules FOR DELETE USING (true);

CREATE POLICY "Public read access for feed_items" ON public.feed_items FOR SELECT USING (true);
CREATE POLICY "Public insert access for feed_items" ON public.feed_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for feed_items" ON public.feed_items FOR UPDATE USING (true);
CREATE POLICY "Public delete access for feed_items" ON public.feed_items FOR DELETE USING (true);

CREATE POLICY "Public read access for logs" ON public.logs FOR SELECT USING (true);
CREATE POLICY "Public insert access for logs" ON public.logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for logs" ON public.logs FOR UPDATE USING (true);
CREATE POLICY "Public delete access for logs" ON public.logs FOR DELETE USING (true);

CREATE POLICY "Public read access for categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public insert access for categories" ON public.categories FOR INSERT WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for feeds
CREATE TRIGGER update_feeds_updated_at
  BEFORE UPDATE ON public.feeds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();