-- Manually recalculate all setlist durations
UPDATE setlists 
SET 
  song_count = subquery.song_count,
  total_duration = subquery.total_duration,
  updated_at = NOW()
FROM (
  SELECT 
    s.id as setlist_id,
    COUNT(songs.id) as song_count,
    CASE 
      WHEN SUM(
        CASE 
          -- Handle MM:SS format (from Spotify) - convert to seconds
          WHEN songs.duration ~ '^\d{1,2}:\d{2}$' THEN 
            EXTRACT(EPOCH FROM CAST(songs.duration || ':00' AS interval))
          -- Handle existing interval format
          WHEN songs.duration IS NOT NULL THEN 
            EXTRACT(EPOCH FROM CAST(songs.duration AS interval))
          ELSE 0
        END
      ) IS NULL OR SUM(
        CASE 
          -- Handle MM:SS format (from Spotify) - convert to seconds
          WHEN songs.duration ~ '^\d{1,2}:\d{2}$' THEN 
            EXTRACT(EPOCH FROM CAST(songs.duration || ':00' AS interval))
          -- Handle existing interval format
          WHEN songs.duration IS NOT NULL THEN 
            EXTRACT(EPOCH FROM CAST(songs.duration AS interval))
          ELSE 0
        END
      ) = 0 THEN CAST('00:00:00' AS interval)
      ELSE 
        CAST(
          CONCAT(
            SUM(
              CASE 
                -- Handle MM:SS format (from Spotify) - convert to seconds
                WHEN songs.duration ~ '^\d{1,2}:\d{2}$' THEN 
                  EXTRACT(EPOCH FROM CAST(songs.duration || ':00' AS interval))
                -- Handle existing interval format
                WHEN songs.duration IS NOT NULL THEN 
                  EXTRACT(EPOCH FROM CAST(songs.duration AS interval))
                ELSE 0
              END
            )::text,
            ' seconds'
          ) AS interval
        )
    END as total_duration
  FROM setlists s
  LEFT JOIN songs ON songs.setlist_id = s.id
  GROUP BY s.id
) AS subquery
WHERE setlists.id = subquery.setlist_id;