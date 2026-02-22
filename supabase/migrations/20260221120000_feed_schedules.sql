-- Update cron to check schedules
CREATE OR REPLACE FUNCTION public.check_all_active_feeds()
RETURNS void AS $$
DECLARE
  feed_record RECORD;
  project_ref TEXT := 'aozbgeguelpphxhptrwy';
  service_key TEXT;
BEGIN
  project_ref := COALESCE(current_setting('vault.project_ref', true), project_ref);
  service_key := current_setting('vault.service_role_key', true);

  -- Only get feeds that have an active schedule and where the next_run is due (or null)
  FOR feed_record IN (
    SELECT f.id, s.interval_minutes 
    FROM public.feeds f
    JOIN public.schedules s ON f.id = s.feed_id
    WHERE f.is_active = true 
    AND s.is_active = true
    AND (s.next_run IS NULL OR s.next_run <= now())
  ) LOOP
    
    -- Update the schedule to set the next_run
    UPDATE public.schedules 
    SET last_run = now(),
        next_run = now() + (feed_record.interval_minutes || ' minutes')::interval
    WHERE feed_id = feed_record.id;

    -- Call process-feed via pg_net
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

-- Reschedule to trigger the check function every 1 MINUTE
SELECT cron.unschedule('auto-sync-feeds-15min');
SELECT cron.unschedule('auto-sync-feeds');
SELECT cron.schedule(
  'auto-sync-feeds',
  '* * * * *',
  'SELECT public.check_all_active_feeds()'
);
