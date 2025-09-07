-- Fix the setlist metadata calculation function
CREATE OR REPLACE FUNCTION update_setlist_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the setlist metadata for the affected setlist
  UPDATE setlists 
  SET 
    song_count = (
      SELECT COUNT(*) 
      FROM songs 
      WHERE setlist_id = COALESCE(NEW.setlist_id, OLD.setlist_id)
    ),
    total_duration = (
      SELECT 
        CASE 
          WHEN SUM(
            CASE 
              -- Handle MM:SS format (from Spotify)
              WHEN duration ~ '^\d{1,2}:\d{2}$' THEN 
                EXTRACT(EPOCH FROM CAST(duration || ':00' AS interval))
              -- Handle existing interval format
              WHEN duration IS NOT NULL THEN
                EXTRACT(EPOCH FROM CAST(duration AS interval))
              ELSE 0
            END
          ) IS NULL OR SUM(
            CASE 
              -- Handle MM:SS format (from Spotify)
              WHEN duration ~ '^\d{1,2}:\d{2}$' THEN 
                EXTRACT(EPOCH FROM CAST(duration || ':00' AS interval))
              -- Handle existing interval format
              WHEN duration IS NOT NULL THEN
                EXTRACT(EPOCH FROM CAST(duration AS interval))
              ELSE 0
            END
          ) = 0 THEN CAST('00:00:00' AS interval)
          ELSE 
            CAST(
              CONCAT(
                SUM(
                  CASE 
                    -- Handle MM:SS format (from Spotify)
                    WHEN duration ~ '^\d{1,2}:\d{2}$' THEN 
                      EXTRACT(EPOCH FROM CAST(duration || ':00' AS interval))
                    -- Handle existing interval format
                    WHEN duration IS NOT NULL THEN
                      EXTRACT(EPOCH FROM CAST(duration AS interval))
                    ELSE 0
                  END
                )::text,
                ' seconds'
              ) AS interval
            )
        END
      FROM songs 
      WHERE setlist_id = COALESCE(NEW.setlist_id, OLD.setlist_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.setlist_id, OLD.setlist_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;