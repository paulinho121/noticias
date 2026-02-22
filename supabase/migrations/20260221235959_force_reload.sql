ALTER TABLE public.white_label_settings ADD COLUMN IF NOT EXISTS image_provider text DEFAULT 'dalle';

NOTIFY pgrst, 'reload schema';
