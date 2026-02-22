-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID -- Optional: if we want to target specific users, but for now it's broadcast
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read access (everyone can see notifications)
CREATE POLICY "Anyone can view notifications" 
ON public.admin_notifications FOR SELECT 
USING (true);

-- Allow authenticated users to insert (in a real app, this would be restricted to admins)
CREATE POLICY "Authenticated users can create notifications" 
ON public.admin_notifications FOR INSERT 
WITH CHECK (true);

-- Allow users to mark as read (if we add that functionality)
CREATE POLICY "Users can update notifications" 
ON public.admin_notifications FOR UPDATE 
USING (true);
