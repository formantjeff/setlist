// Spotify Web API service for searching songs

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      height: number;
      width: number;
      url: string;
    }>;
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifySearchResponse {
  tracks: {
    href: string;
    items: SpotifyTrack[];
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
  };
}

// Spotify uses client credentials flow for public search
// This requires a client ID but no user authentication for basic searches
let accessToken: string | null = null;
let tokenExpiry: number = 0;

// For production, you'd want to store these securely
// For now, we'll use environment variables or hardcoded (demo only)
const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID || 'demo_client_id';
const CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET || 'demo_client_secret';

console.log('Spotify Client ID:', CLIENT_ID ? CLIENT_ID.slice(0, 8) + '...' : 'not loaded');
console.log('Spotify Client Secret:', CLIENT_SECRET ? CLIENT_SECRET.slice(0, 8) + '...' : 'not loaded');

// Get access token using Client Credentials flow
async function getAccessToken(): Promise<string> {
  // Check if we have a valid token
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Spotify token request failed:', response.status, response.statusText, errorData);
      throw new Error(`Failed to get Spotify access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Subtract 60s for safety

    return accessToken!;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw error;
  }
}

// Search for tracks on Spotify
export async function searchSpotifyTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
  try {
    const token = await getAccessToken();
    
    const searchParams = new URLSearchParams({
      q: query,
      type: 'track',
      limit: limit.toString(),
      market: 'US' // Can be made configurable
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.statusText}`);
    }

    const data: SpotifySearchResponse = await response.json();
    return data.tracks.items;
  } catch (error) {
    console.error('Error searching Spotify:', error);
    throw error;
  }
}

// Get the best image URL from Spotify album images
export function getBestImageUrl(images: SpotifyTrack['album']['images']): string | null {
  if (!images || images.length === 0) return null;
  
  // Sort by size and return the medium-sized image (usually 300x300)
  const sortedImages = images.sort((a, b) => b.width - a.width);
  
  // Try to find a good middle size (around 300px)
  const mediumImage = sortedImages.find(img => img.width >= 250 && img.width <= 400);
  if (mediumImage) return mediumImage.url;
  
  // Otherwise return the largest
  return sortedImages[0]?.url || null;
}

// Convert Spotify track duration to MM:SS format
export function formatSpotifyDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Convert Spotify track to our Song format
export function spotifyTrackToSong(track: SpotifyTrack) {
  const totalSeconds = Math.floor(track.duration_ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  // Always use HH:MM:SS format for PostgreSQL interval compatibility
  const intervalDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return {
    name: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    duration: intervalDuration,
    thumbnail_url: getBestImageUrl(track.album.images),
    // Additional metadata we can now store
    spotify_id: track.id,
    spotify_url: track.external_urls.spotify,
    album: track.album.name,
    release_date: track.album.release_date,
    popularity: track.popularity,
    preview_url: track.preview_url
  };
}