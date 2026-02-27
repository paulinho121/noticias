-- Add include_source_link to feeds table
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS include_source_link BOOLEAN DEFAULT false;
