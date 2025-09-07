// Vercel serverless function to fetch lyrics from Genius API
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

  const accessToken = process.env.GENIUS_ACCESS_TOKEN;

  if (!accessToken) {
    console.log('GENIUS_ACCESS_TOKEN not configured in Vercel environment variables');
    return res.status(500).json({ error: 'API configuration missing' });
  }

  try {
    // Search for the song on Genius
    const searchQuery = `${title} ${artist}`.trim();
    const searchResponse = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Genius search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const hits = searchData.response?.hits;

    if (!hits || hits.length === 0) {
      return res.status(404).json({ error: 'No lyrics found' });
    }

    // Find the best match (first result is usually most relevant)
    const song = hits[0].result;
    
    // Return lyrics info (Genius doesn't provide full lyrics via API due to licensing)
    const lyricsData = {
      lyrics: `Lyrics available on Genius: ${song.url}\n\n[Visit link for full lyrics]`,
      source: 'genius.com',
      confidence: 0.9,
      url: song.url,
      title: song.title,
      artist: song.primary_artist.name
    };

    return res.status(200).json(lyricsData);

  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
}