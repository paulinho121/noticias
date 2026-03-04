-- Migration: Notification preferences per organization
-- Adds notification settings columns to the organizations table

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS notif_email         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_error_alerts  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_published      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_email_address TEXT;
