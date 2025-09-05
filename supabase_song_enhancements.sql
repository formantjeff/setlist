-- Add enhanced song fields
ALTER TABLE songs ADD COLUMN IF NOT EXISTS artist text;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS duration interval DEFAULT '00:03:00'::interval;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS tempo integer DEFAULT 120;

-- Update existing songs to have default duration
UPDATE songs SET duration = '00:03:00'::interval WHERE duration IS NULL;
UPDATE songs SET tempo = 120 WHERE tempo IS NULL;