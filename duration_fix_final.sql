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
      SELECT COALESCE(SUM(duration::interval), interval '0')
      FROM songs 
      WHERE setlist_id = COALESCE(NEW.setlist_id, OLD.setlist_id)
        AND duration IS NOT NULL
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.setlist_id, OLD.setlist_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;