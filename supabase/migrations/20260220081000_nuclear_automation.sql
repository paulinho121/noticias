-- Migration: Nuclear Automation
-- This migration sets up the automatic processing pipeline:
-- 1. Ingestion -> 2. Automatic Rewrite (Trigger) -> 3. Optional Auto-Publish

-- Enable the pg_net extension for making HTTP requests from SQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Migration: Nuclear Automation v2 (Fully Autonomous)
-- This migration ensures that everything happens without human intervention.

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Improved Trigger Function
CREATE OR REPLACE FUNCTION public.trigger_rewrite_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  project_ref TEXT := 'aozbgeguelpphxhptrwy'; -- Hardcoded fallback for reliability
  service_key TEXT;
  payload JSONB;
BEGIN
  -- Only act if status is 'pending'
  IF (NEW.status != 'pending') THEN
    RETURN NEW;
  END IF;

  -- Try to get settings from vault, fallback to hardcoded if necessary
  BEGIN
    project_ref := COALESCE(current_setting('vault.project_ref', true), project_ref);
    service_key := current_setting('vault.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback for local dev or missing vault
    service_key := NULL; 
  END;

  -- Construct payload for the rewrite engine
  payload := jsonb_build_object(
    'feedItemId', NEW.id,
    'isAsync', true
  );

  -- Call the Rewrite engine
  -- Note: We use the internal network if possible, or public URL
  PERFORM net.http_post(
    url := 'https://' || project_ref || '.supabase.co/functions/v1/rewrite-content',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, 'YOUR_SYSTEM_KEY_IF_VAULT_FAILS')
    ),
    body := payload
  );

  -- Set status to processing IMMEDIATELY to prevent double triggers
  NEW.status := 'processing';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-apply Trigger (Insert and Update)
DROP TRIGGER IF EXISTS on_feed_item_created_trigger ON public.feed_items;
CREATE TRIGGER on_feed_item_created_trigger
  BEFORE INSERT OR UPDATE OF status ON public.feed_items
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.trigger_rewrite_on_insert();

-- 4. Improved Cron Job (Check every 15 minutes)
CREATE OR REPLACE FUNCTION public.check_all_active_feeds()
RETURNS void AS $$
DECLARE
  feed_record RECORD;
  project_ref TEXT := 'aozbgeguelpphxhptrwy';
  service_key TEXT;
BEGIN
  project_ref := COALESCE(current_setting('vault.project_ref', true), project_ref);
  service_key := current_setting('vault.service_role_key', true);

  FOR feed_record IN (SELECT id FROM public.feeds WHERE is_active = true) LOOP
    PERFORM net.http_post(
      url := 'https://' || project_ref || '.supabase.co/functions/v1/process-feed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object('feedId', feed_record.id)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Schedule (Ensure it exists and is clean)
SELECT cron.unschedule('auto-sync-feeds-15min');
SELECT cron.schedule(
  'auto-sync-feeds-15min',
  '*/15 * * * *',
  'SELECT public.check_all_active_feeds()'
);
