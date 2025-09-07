// Vercel serverless function to fetch full lyrics text
// This avoids CORS issues by calling the API from the server-side

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { artist, title } = req.body;

  if (!artist || !title) {
    return res.status(400).json({ error: 'Artist and title are required' });
  }

  try {
    // Try multiple lyrics APIs in order of preference
    let lyricsData = null;
    
    // Try lyrics.ovh first (free, provides full text)
    try {
      const lyricsOvhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      const lyricsOvhResponse = await fetch(lyricsOvhUrl);
      
      if (lyricsOvhResponse.ok) {
        const data = await lyricsOvhResponse.json();
        if (data.lyrics && data.lyrics.trim()) {
          lyricsData = {
            lyrics: data.lyrics.trim(),
            source: 'lyrics.ovh',
            confidence: 0.8
          };
        }
      }
    } catch (error) {
      console.log('lyrics.ovh failed, trying next API');
    }
    
    // Fallback to Genius API for metadata (if lyrics.ovh failed)
    if (!lyricsData) {
      const accessToken = process.env.GENIUS_ACCESS_TOKEN;
      
      if (accessToken) {
        try {
          const searchQuery = `${title} ${artist}`.trim();
          const searchResponse = await fetch(
            `https://api.genius.com/search?q=${encodeURIComponent(searchQuery)}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const hits = searchData.response?.hits;

            if (hits && hits.length > 0) {
              const song = hits[0].result;
              lyricsData = {
                lyrics: `Lyrics available on Genius: ${song.url}\n\n[Visit link for full lyrics]`,
                source: 'genius.com',
                confidence: 0.7,
                url: song.url,
                title: song.title,
                artist: song.primary_artist.name
              };
            }
          }
        } catch (error) {
          console.log('Genius API also failed');
        }
      }
    }
    
    if (lyricsData) {
      return res.status(200).json(lyricsData);
    } else {
      return res.status(404).json({ error: 'No lyrics found from any source' });
    }

  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
}