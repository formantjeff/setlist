CREATE OR REPLACE FUNCTION update_setlist_metadata()
RETURNS TRIGGER AS $$
BEGIN
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
          WHEN COUNT(*) = 0 THEN interval '0'
          ELSE 
            COALESCE(SUM(
              CASE 
                WHEN duration ~ '^\d{1,2}:\d{2}$' THEN 
                  (duration || ':00')::interval
                WHEN duration IS NOT NULL THEN
                  duration::interval
                ELSE interval '0'
              END
            ), interval '0')
        END
      FROM songs 
      WHERE setlist_id = COALESCE(NEW.setlist_id, OLD.setlist_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.setlist_id, OLD.setlist_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;