// Music metadata service for lyrics and chord progression generation

export interface LyricsData {
  lyrics: string;
  source: string;
  confidence: number;
}

export interface ChordProgression {
  key: string;
  chords: string[];
  pattern: string;
}

// Common chord progressions for different keys
const COMMON_CHORD_PROGRESSIONS: Record<string, string[]> = {
  // Major keys
  'C': ['C', 'Am', 'F', 'G'],
  'G': ['G', 'Em', 'C', 'D'], 
  'D': ['D', 'Bm', 'G', 'A'],
  'A': ['A', 'F#m', 'D', 'E'],
  'E': ['E', 'C#m', 'A', 'B'],
  'B': ['B', 'G#m', 'E', 'F#'],
  'F#': ['F#', 'D#m', 'B', 'C#'],
  'F': ['F', 'Dm', 'Bb', 'C'],
  'Bb': ['Bb', 'Gm', 'Eb', 'F'],
  'Eb': ['Eb', 'Cm', 'Ab', 'Bb'],
  'Ab': ['Ab', 'Fm', 'Db', 'Eb'],
  'Db': ['Db', 'Bbm', 'Gb', 'Ab'],
  // Minor keys
  'Am': ['Am', 'F', 'C', 'G'],
  'Em': ['Em', 'C', 'G', 'D'],
  'Bm': ['Bm', 'G', 'D', 'A'],
  'F#m': ['F#m', 'D', 'A', 'E'],
  'C#m': ['C#m', 'A', 'E', 'B'],
  'G#m': ['G#m', 'E', 'B', 'F#'],
  'D#m': ['D#m', 'B', 'F#', 'C#'],
  'Dm': ['Dm', 'Bb', 'F', 'C'],
  'Gm': ['Gm', 'Eb', 'Bb', 'F'],
  'Cm': ['Cm', 'Ab', 'Eb', 'Bb'],
  'Fm': ['Fm', 'Db', 'Ab', 'Eb'],
  'Bbm': ['Bbm', 'Gb', 'Db', 'Ab']
};

// Fetch lyrics from Genius API via backend/serverless function
export async function fetchLyrics(artist: string, title: string): Promise<LyricsData | null> {
  try {
    // Check if we're in development or production
    const isProduction = window.location.hostname !== 'localhost';
    
    if (isProduction) {
      // In production, use the Vercel serverless function
      const response = await fetch('/api/lyrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artist, title })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          lyrics: data.lyrics,
          source: data.source,
          confidence: data.confidence
        };
      } else if (response.status === 404) {
        console.log(`No lyrics found for "${title}" by ${artist}`);
        return null;
      } else {
        throw new Error(`Lyrics API failed: ${response.status}`);
      }
    } else {
      // In development, skip lyrics due to CORS
      console.log(`Lyrics search for "${title}" by ${artist} - will work when deployed to Vercel`);
      return null;
    }
  } catch (error) {
    console.warn('Failed to fetch lyrics:', error);
    return null;
  }
}

// Generate chord progression using Spotify audio features or fallback detection
export function generateChordProgression(songTitle: string, artist: string, audioFeatures?: any): ChordProgression {
  let detectedKey = 'C';
  let mode = 'major';
  
  if (audioFeatures && audioFeatures.key !== null && audioFeatures.mode !== null) {
    // Spotify provides key as integer (0 = C, 1 = C#, etc.) and mode (0 = minor, 1 = major)
    const keyNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    detectedKey = keyNames[audioFeatures.key] || 'C';
    mode = audioFeatures.mode === 1 ? 'major' : 'minor';
    
    // For minor keys, use the relative minor chord progressions
    if (mode === 'minor') {
      detectedKey = detectedKey + 'm';
    }
  } else {
    // Fallback to simple heuristic detection
    detectedKey = detectKey(songTitle, artist);
  }
  
  const progression = COMMON_CHORD_PROGRESSIONS[detectedKey as keyof typeof COMMON_CHORD_PROGRESSIONS] || COMMON_CHORD_PROGRESSIONS['C'];
  
  return {
    key: detectedKey,
    chords: progression,
    pattern: mode === 'minor' ? 'i-VI-III-VII' : 'I-vi-IV-V'
  };
}

// Basic key detection (simplified approach)
function detectKey(title: string, artist: string): string {
  const text = (title + ' ' + artist).toLowerCase();
  
  // Simple heuristics for key detection
  if (text.includes('blue') || text.includes('sad')) return 'Am';
  if (text.includes('happy') || text.includes('bright')) return 'G';
  if (text.includes('rock') || text.includes('metal')) return 'E';
  if (text.includes('country') || text.includes('folk')) return 'G';
  if (text.includes('jazz')) return 'F';
  
  // Default to C major
  return 'C';
}

// Enhanced song data with metadata - matching database schema
export interface EnhancedSongData {
  name: string;
  artist: string;
  duration: string;
  thumbnail_url?: string | null;
  spotify_id?: string;
  spotify_url?: string;
  album?: string;
  release_date?: string;
  popularity?: number;
  preview_url?: string | null;
  lyrics?: string;
  chords?: string; // This matches the database column
}

// Enhance song data with lyrics and chords
export async function enhanceSongData(songData: any, audioFeatures?: any): Promise<EnhancedSongData> {
  const enhanced: EnhancedSongData = {
    ...songData
  };

  try {
    // Fetch lyrics from Genius API
    const lyricsData = await fetchLyrics(songData.artist, songData.name);
    if (lyricsData) {
      enhanced.lyrics = lyricsData.lyrics;
    }

    // Generate chord progression using Spotify audio features for accuracy
    const chordProgression = generateChordProgression(songData.name, songData.artist, audioFeatures);
    enhanced.chords = `${chordProgression.key}: ${chordProgression.chords.join(' - ')} (${chordProgression.pattern})`;
  } catch (error) {
    console.warn('Failed to enhance song data:', error);
  }

  return enhanced;
}