
-- Migration to fix missing subscription columns in organizations table
-- This is necessary for the payment system and subscription countdown to function correctly.

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_trial';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Ensure proper permissions
GRANT ALL ON public.organizations TO authenticated, service_role, anon;

-- Update existing organizations to have 'free_trial' if they are null
UPDATE public.organizations SET subscription_plan = 'free_trial' WHERE subscription_plan IS NULL;
