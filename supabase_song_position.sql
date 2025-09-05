-- Add position field to songs table for drag-and-drop ordering
ALTER TABLE songs ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- Update existing songs to have sequential positions based on created_at
UPDATE songs 
SET position = sub.row_number - 1 
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY band_id ORDER BY created_at) as row_number 
  FROM songs
) sub 
WHERE songs.id = sub.id;