import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Card, CardHeader, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';

interface Song {
  id: string;
  name: string;
  artist: string;
  duration: string;
  thumbnail_url?: string;
  album?: string;
  popularity?: number;
  chords?: string;
  lyrics?: string;
}

interface SongLibraryProps {
  onSongSelect: (song: Song) => void;
  onClose: () => void;
}

export default function SongLibrary({ onSongSelect, onClose }: SongLibraryProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'artist' | 'popularity'>('name');
  const [loading, setLoading] = useState(true);

  // Fetch all songs from database
  useEffect(() => {
    fetchAllSongs();
  }, []);

  // Filter songs based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSongs(songs);
    } else {
      const filtered = songs.filter(song =>
        song.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.album?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSongs(filtered);
    }
  }, [searchTerm, songs]);

  // Sort songs
  useEffect(() => {
    const sorted = [...filteredSongs].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'artist':
          return a.artist.localeCompare(b.artist);
        case 'popularity':
          return (b.popularity || 0) - (a.popularity || 0);
        default:
          return 0;
      }
    });
    setFilteredSongs(sorted);
  }, [sortBy, filteredSongs]);

  const fetchAllSongs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('name');

      if (error) throw error;
      
      setSongs(data || []);
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration: string): string => {
    if (duration.includes(':') && duration.split(':').length === 3) {
      const [hours, minutes, seconds] = duration.split(':');
      if (hours === '00') {
        return `${minutes}:${seconds}`;
      }
    }
    return duration;
  };

  const handleSongSelect = (song: Song) => {
    onSongSelect(song);
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p>Loading song library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Song Library</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Search and filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search songs, artists, or albums..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'artist' | 'popularity')}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="artist">Sort by Artist</option>
              <option value="popularity">Sort by Popularity</option>
            </select>
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            {filteredSongs.length} of {songs.length} songs
          </p>
        </div>

        {/* Songs list */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-4">
            {filteredSongs.map((song) => (
              <Card 
                key={song.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSongSelect(song)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    {song.thumbnail_url && (
                      <img
                        src={song.thumbnail_url}
                        alt={`${song.name} album art`}
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    
                    {/* Song info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{song.name}</h3>
                      <p className="text-gray-600">{song.artist}</p>
                      {song.album && (
                        <p className="text-sm text-gray-500">{song.album}</p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {formatDuration(song.duration)}
                        </Badge>
                        
                        {song.popularity && (
                          <Badge variant="secondary">
                            {song.popularity}% popularity
                          </Badge>
                        )}
                        
                        {song.chords && (
                          <Badge variant="outline">
                            Has chords
                          </Badge>
                        )}
                        
                        {song.lyrics && (
                          <Badge variant="outline">
                            Has lyrics
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Quick preview of chords if available */}
                    {song.chords && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">Chords</p>
                        <p className="text-sm font-mono">
                          {song.chords.length > 30 
                            ? song.chords.substring(0, 30) + '...'
                            : song.chords
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSongs.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <p className="text-gray-500">No songs found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}