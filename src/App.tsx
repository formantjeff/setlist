import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase, Song, Profile, Band, Setlist } from './supabase';
import { AuthProvider, useAuth } from './AuthContext';
import { Auth } from './Auth';
import { UserAvatar } from './UserAvatar';
import { ThemeProvider } from './ThemeContext';
import { Settings as SettingsComponent } from './Settings';
import { BandSelection } from './BandSelection';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { ArrowLeft, MoreHorizontal, Edit3, Trash2, Music, Heart, Share2, RotateCcw, Plus, Settings as SettingsIcon, User, Moon, Sun, Search, Globe, Library, FileText, ChevronDown, Calendar, MapPin, Clock } from 'lucide-react';
import { useTheme } from './ThemeContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { searchSpotifyTracks, spotifyTrackToSong, spotifyTrackToSongWithData, SpotifyTrack } from './services/spotify';
import SongLibrary from './SongLibrary';

interface SortableItemProps {
  id: string;
  song: Song;
  onSongClick: (song: Song) => void;
  formatDuration: (duration?: string) => string;
  showDragHandle: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, song, onSongClick, formatDuration, showDragHandle }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer transition-all hover:shadow-md ${isDragging ? 'shadow-lg' : ''}`}
      onClick={() => {
        if (!isDragging) {
          onSongClick(song);
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {showDragHandle && (
            <div 
              {...attributes}
              {...listeners}
              className="flex-shrink-0 cursor-grab active:cursor-grabbing" 
              title="Drag to reorder songs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col space-y-1 p-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
              </div>
            </div>
          )}
          
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            {song.thumbnail_url ? (
              <div className="relative w-12 h-12">
                <img 
                  src={song.thumbnail_url} 
                  alt={`${song.name} thumbnail`} 
                  className="w-12 h-12 rounded-md object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', song.thumbnail_url);
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLDivElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', song.thumbnail_url);
                  }}
                />
                <div className="absolute inset-0 w-12 h-12 rounded-md bg-muted flex items-center justify-center" style={{display: 'none'}}>
                  <Music className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                <Music className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{song.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{song.artist || 'Unknown Artist'}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className="text-xs px-2 py-0">
                {formatDuration(song.duration)}
              </Badge>
              {song.tempo && (
                <Badge variant="outline" className="text-xs px-2 py-0">
                  {song.tempo} BPM
                </Badge>
              )}
            </div>
          </div>
          
          {/* Version */}
          <div className="flex-shrink-0">
            <Badge variant="secondary" className="text-xs">v.1</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SetlistManager: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [newSongName, setNewSongName] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isAddingLyrics, setIsAddingLyrics] = useState(false);
  const [editLyrics, setEditLyrics] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDuration, setEditDuration] = useState('3:00');
  const [editTempo, setEditTempo] = useState('120');
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isAddingNotes, setIsAddingNotes] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [currentView, setCurrentView] = useState<'songs' | 'settings' | 'account'>('songs');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editInstrument, setEditInstrument] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [currentBand, setCurrentBand] = useState<Band | null>(null);
  const [userBandId, setUserBandId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddSongMenu, setShowAddSongMenu] = useState(false);
  const [addSongMethod, setAddSongMethod] = useState<'search' | 'library' | 'create' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSongLibrary, setShowSongLibrary] = useState(false);
  // Setlist management state
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(null);
  const [showSetlistSelector, setShowSetlistSelector] = useState(false);
  const [showCreateSetlist, setShowCreateSetlist] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');
  const [newSetlistVenue, setNewSetlistVenue] = useState('');
  const [newSetlistDescription, setNewSetlistDescription] = useState('');
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced distance for better responsiveness
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user) {
      fetchSongs();
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    if (userBandId) {
      fetchSetlists();
      fetchBand();
    }
  }, [userBandId]);

  useEffect(() => {
    if (currentSetlist) {
      fetchSongs();
    }
  }, [currentSetlist]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data || null);
      setEditDisplayName(data?.display_name || '');
      setEditInstrument(data?.instrument || '');
      setUserBandId(data?.band_id || null);
    }
  };

  const fetchSongs = async () => {
    if (!user || !userBandId || !currentSetlist) return;
    
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('band_id', userBandId)
      .eq('setlist_id', currentSetlist.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching songs:', error);
    } else {
      setSongs(data || []);
    }
  };

  const fetchSetlists = async () => {
    if (!user || !userBandId) return;
    
    const { data, error } = await supabase
      .from('setlists')
      .select('*')
      .eq('band_id', userBandId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching setlists:', error);
    } else {
      setSetlists(data || []);
      // If no current setlist selected, select the first one
      if (!currentSetlist && data && data.length > 0) {
        setCurrentSetlist(data[0]);
      }
    }
  };

  const fetchBand = async () => {
    if (!userBandId) return;
    
    const { data, error } = await supabase
      .from('bands')
      .select('*')
      .eq('id', userBandId)
      .single();
    
    if (error) {
      console.error('Error fetching band:', error);
    } else {
      setCurrentBand(data);
    }
  };

  const addSong = async () => {
    if (!newSongName.trim() || !user || !userBandId || !currentSetlist) return;

    // Get the highest position to add the new song at the end
    const maxPosition = songs.length > 0 ? Math.max(...songs.map(s => s.position || 0)) + 1 : 0;

    const { data, error } = await supabase
      .from('songs')
      .insert([{ 
        name: newSongName.trim(), 
        user_id: user.id,
        band_id: userBandId,
        setlist_id: currentSetlist.id,
        position: maxPosition
      }])
      .select();

    if (error) {
      console.error('Error adding song:', error);
    } else {
      setSongs([...songs, ...data]);
      setNewSongName('');
      // Reset the add song menu
      setShowAddSongMenu(false);
      setAddSongMethod(null);
      // Refresh setlist metadata
      fetchSetlists();
    }
  };

  const updateSong = async (id: string, updates: Partial<Song>) => {
    const { data, error } = await supabase
      .from('songs')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating song:', error);
    } else {
      setSongs(songs.map(song => song.id === id ? data[0] : song));
      if (selectedSong?.id === id) {
        setSelectedSong(data[0]);
      }
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Error updating profile:', error);
    } else {
      setProfile(data[0]);
    }
  };

  const deleteSong = async (id: string) => {
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting song:', error);
    } else {
      setSongs(songs.filter(song => song.id !== id));
      if (selectedSong?.id === id) {
        setSelectedSong(null);
      }
      // Refresh setlist metadata
      fetchSetlists();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
  };

  // Drag and drop handler
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = songs.findIndex((song) => song.id === active.id);
      const newIndex = songs.findIndex((song) => song.id === over?.id);

      console.log(`Moving song from position ${oldIndex} to ${newIndex}`);

      // Reorder songs array using dnd-kit's arrayMove
      const newSongs = arrayMove(songs, oldIndex, newIndex);

      // Update local state immediately for smooth UX
      setSongs(newSongs);

      // Update positions in database
      try {
        const updates = newSongs.map((song, index) => 
          supabase
            .from('songs')
            .update({ position: index })
            .eq('id', song.id)
        );
        
        await Promise.all(updates);
        console.log('Song positions updated successfully');
      } catch (error) {
        console.error('Error updating song positions:', error);
        // Revert on error
        fetchSongs();
      }
    }
  };

  const handleSaveLyrics = () => {
    if (selectedSong) {
      updateSong(selectedSong.id, { lyrics: editLyrics });
      setIsAddingLyrics(false);
    }
  };

  const handleSaveDetails = async () => {
    if (selectedSong) {
      let thumbnailUrl = selectedSong.thumbnail_url;
      
      // Upload image if one was selected
      if (selectedImage) {
        console.log('Starting image upload for:', selectedImage.name);
        const uploadedUrl = await uploadImageToSupabase(selectedImage);
        if (uploadedUrl) {
          console.log('Image upload successful, updating thumbnail_url to:', uploadedUrl);
          thumbnailUrl = uploadedUrl;
        } else {
          console.error('Image upload failed');
        }
      }
      
      console.log('Updating song with thumbnail_url:', thumbnailUrl);
      updateSong(selectedSong.id, { 
        artist: editArtist.trim() || undefined,
        duration: editDuration,
        tempo: parseInt(editTempo) || 120,
        thumbnail_url: thumbnailUrl
      });
      
      // Clear selected image and close edit form
      setSelectedImage(null);
      setIsEditingDetails(false);
    }
  };

  const handleSaveNotes = () => {
    if (selectedSong) {
      updateSong(selectedSong.id, { notes: editNotes });
      setIsAddingNotes(false);
    }
  };

  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    if (!user || !selectedSong) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedSong.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error } = await supabase.storage
        .from('song-images')
        .upload(filePath, file);

      if (error) {
        console.error('Error uploading image:', error);
        alert(`Image upload failed: ${error.message}. Please make sure the 'song-images' bucket exists in Supabase Storage.`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('song-images')
        .getPublicUrl(filePath);

      console.log('Generated public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Unexpected error uploading image:', error);
      alert('An unexpected error occurred while uploading the image. Please try again.');
      return null;
    }
  };

  const formatDuration = (duration?: string): string => {
    if (!duration) return '3:00';
    
    console.log('formatDuration input:', duration);
    
    // If it's already in MM:SS format (from Spotify), return as is
    if (duration.match(/^\d{1,2}:\d{2}$/)) {
      console.log('formatDuration MM:SS format, returning:', duration);
      return duration;
    }
    
    // Convert PostgreSQL interval to MM:SS format (for legacy songs)
    if (duration.includes(':')) {
      const parts = duration.split(':');
      if (parts.length >= 3) {
        // PostgreSQL format: HH:MM:SS - convert to MM:SS
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]) + (hours * 60); // Convert hours to minutes
        const seconds = parts[2].split('.')[0];
        const result = `${minutes}:${seconds.padStart(2, '0')}`;
        console.log('formatDuration PostgreSQL format, converted to:', result);
        return result;
      } else if (parts.length === 2) {
        // Simple MM:SS format
        console.log('formatDuration MM:SS format, returning:', duration);
        return duration;
      }
    }
    console.log('formatDuration fallback, returning:', duration);
    return duration;
  };

  // Helper function to extract unique chords from lyrics text
  const extractChordsFromLyrics = (lyrics: string): string[] => {
    if (!lyrics) return [];
    
    // Match chord patterns like [G], [Em], [C#m], [F#], etc.
    const chordRegex = /\[([A-G][#b]?m?(?:maj7|min7|7|sus2|sus4|add9|6|9|11|13)?(?:\/[A-G][#b]?)?)\]/g;
    const matches = lyrics.match(chordRegex);
    
    if (!matches) return [];
    
    // Extract just the chord names and remove duplicates
    const chords = matches
      .map(match => match.replace(/[[\]]/g, ''))
      .filter((chord, index, arr) => arr.indexOf(chord) === index);
    
    return chords;
  };

  // Helper function to parse lyrics with chord positioning
  const parseLyricsWithChords = (lyrics: string) => {
    if (!lyrics) return [];
    
    const lines = lyrics.split('\n');
    return lines.map(line => {
      const parts = [];
      let currentPos = 0;
      
      // Find chord positions in the line
      const chordRegex = /\[([A-G][#b]?m?(?:maj7|min7|7|sus2|sus4|add9|6|9|11|13)?(?:\/[A-G][#b]?)?)\]/g;
      let match;
      
      while ((match = chordRegex.exec(line)) !== null) {
        // Add text before chord
        if (match.index > currentPos) {
          parts.push({
            type: 'text',
            content: line.slice(currentPos, match.index)
          });
        }
        
        // Add chord
        parts.push({
          type: 'chord',
          content: match[1]
        });
        
        currentPos = match.index + match[0].length;
      }
      
      // Add remaining text
      if (currentPos < line.length) {
        parts.push({
          type: 'text',
          content: line.slice(currentPos)
        });
      }
      
      return parts;
    });
  };

  // Simple chord diagram component
  const SimpleChordDiagram: React.FC<{ chord: string }> = ({ chord }) => {
    // Basic chord fingering patterns for common chords
    const chordPatterns: { [key: string]: number[] } = {
      'G': [3, 2, 0, 0, 3, 3],
      'C': [-1, 3, 2, 0, 1, 0],
      'D': [-1, -1, 0, 2, 3, 2],
      'Em': [0, 2, 2, 0, 0, 0],
      'Am': [-1, 0, 2, 2, 1, 0],
      'F': [1, 3, 3, 2, 1, 1],
      'E': [0, 2, 2, 1, 0, 0],
      'A': [-1, 0, 2, 2, 2, 0],
      'Dm': [-1, -1, 0, 2, 3, 1],
      'B7': [-1, 2, 1, 2, 0, 2],
      'C7': [-1, 3, 2, 3, 1, 0],
      'G7': [3, 2, 0, 0, 0, 1],
    };

    const frets = chordPatterns[chord] || [-1, -1, -1, -1, -1, -1];
    const strings = 6;
    const fretCount = 4;

    return (
      <svg width="48" height="64" viewBox="0 0 48 64" className="chord-diagram">
        {/* Fret lines */}
        {Array.from({ length: fretCount + 1 }, (_, i) => (
          <line
            key={`fret-${i}`}
            x1="8"
            y1={8 + i * 12}
            x2="40"
            y2={8 + i * 12}
            stroke="white"
            strokeWidth={i === 0 ? "2" : "1"}
          />
        ))}
        
        {/* String lines */}
        {Array.from({ length: strings }, (_, i) => (
          <line
            key={`string-${i}`}
            x1={8 + i * 6.4}
            y1="8"
            x2={8 + i * 6.4}
            y2="56"
            stroke="white"
            strokeWidth="1"
          />
        ))}
        
        {/* Finger positions */}
        {frets.map((fret, stringIndex) => {
          if (fret === -1) return null; // Muted string
          if (fret === 0) {
            // Open string - circle at the top
            return (
              <circle
                key={`open-${stringIndex}`}
                cx={8 + stringIndex * 6.4}
                cy="4"
                r="2"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
              />
            );
          }
          // Fretted note - filled circle
          return (
            <circle
              key={`fret-${stringIndex}-${fret}`}
              cx={8 + stringIndex * 6.4}
              cy={8 + fret * 12 - 6}
              r="3"
              fill="white"
            />
          );
        })}
        
        {/* Muted strings */}
        {frets.map((fret, stringIndex) => {
          if (fret !== -1) return null;
          return (
            <g key={`muted-${stringIndex}`}>
              <line
                x1={8 + stringIndex * 6.4 - 2}
                y1="2"
                x2={8 + stringIndex * 6.4 + 2}
                y2="6"
                stroke="white"
                strokeWidth="1.5"
              />
              <line
                x1={8 + stringIndex * 6.4 - 2}
                y1="6"
                x2={8 + stringIndex * 6.4 + 2}
                y2="2"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
          );
        })}
      </svg>
    );
  };

  const handleSaveProfile = async () => {
    await updateProfile({
      display_name: editDisplayName.trim() || undefined,
      instrument: editInstrument.trim() || undefined
    });
    setIsEditingProfile(false);
  };

  const handleBandSelected = async (bandId: string) => {
    setUserBandId(bandId);
    await updateProfile({ band_id: bandId });
  };

  const handleLeaveBand = async () => {
    if (!user || !userBandId) return;
    
    // Remove from band_members table
    await supabase
      .from('band_members')
      .delete()
      .eq('user_id', user.id)
      .eq('band_id', userBandId);
    
    // Update profile to remove band_id
    await updateProfile({ band_id: null });
    setUserBandId(null);
    setCurrentBand(null);
  };

  // Create a new setlist
  const createSetlist = async () => {
    if (!user || !userBandId || !newSetlistName.trim()) return;

    const { data, error } = await supabase
      .from('setlists')
      .insert([{
        name: newSetlistName.trim(),
        description: newSetlistDescription.trim() || undefined,
        venue: newSetlistVenue.trim() || undefined,
        band_id: userBandId,
        created_by: user.id
      }])
      .select();

    if (error) {
      console.error('Error creating setlist:', error);
    } else {
      setSetlists([data[0], ...setlists]);
      setCurrentSetlist(data[0]);
      setNewSetlistName('');
      setNewSetlistDescription('');
      setNewSetlistVenue('');
      setShowCreateSetlist(false);
    }
  };

  // Switch to a different setlist
  const switchSetlist = (setlist: Setlist) => {
    setCurrentSetlist(setlist);
    setShowSetlistSelector(false);
  };

  // Search for songs using Spotify API
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchSpotifyTracks(searchQuery, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      // For demo purposes, show mock results if API fails
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Add song from Spotify search result
  const addSongFromSpotify = async (track: SpotifyTrack) => {
    if (!user || !userBandId || !currentSetlist) return;

    const songData = await spotifyTrackToSongWithData(track);
    
    // Get the highest position to add the new song at the end
    const maxPosition = songs.length > 0 ? Math.max(...songs.map(s => s.position || 0)) + 1 : 0;

    const { data, error } = await supabase
      .from('songs')
      .insert([{ 
        ...songData,
        user_id: user.id,
        band_id: userBandId,
        setlist_id: currentSetlist.id,
        position: maxPosition
      }])
      .select();

    if (error) {
      console.error('Error adding song from Spotify:', error);
    } else {
      setSongs([...songs, ...data]);
      // Reset the search interface
      setSearchQuery('');
      setSearchResults([]);
      setShowAddSongMenu(false);
      setAddSongMethod(null);
      // Refresh setlist metadata
      fetchSetlists();
    }
  };

  // Add song from library
  const addSongFromLibrary = async (song: Song) => {
    if (!user || !userBandId || !currentSetlist) return;

    try {
      console.log('Adding song from library:', song.name, 'by', song.artist);
      
      // Get the highest position to add the new song at the end
      const maxPosition = songs.length > 0 ? Math.max(...songs.map(s => s.position || 0)) + 1 : 0;

      const { data, error } = await supabase
        .from('songs')
        .insert([{
          ...song,
          user_id: user.id,
          band_id: userBandId,
          setlist_id: currentSetlist.id,
          position: maxPosition,
          id: undefined // Let database generate new ID
        }])
        .select();

      if (error) {
        console.error('Error adding song from library:', error);
      } else {
        setSongs([...songs, ...data]);
        setShowAddSongMenu(false);
        setAddSongMethod(null);
        // Refresh setlist metadata
        fetchSetlists();
      }
    } catch (error) {
      console.error('Error adding song from library:', error);
    }
  };

  // If user doesn't have a band, show band selection
  if (!userBandId) {
    return <BandSelection onBandSelected={handleBandSelected} />;
  }

  // Settings view
  if (currentView === 'settings') {
    return <SettingsComponent onBack={() => setCurrentView('songs')} />;
  }

  // Account view
  if (currentView === 'account') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentView('songs')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-lg font-semibold">Account</h1>
            <div className="w-20"></div>
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Account Information</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Band Information</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-sm font-medium">Current Band</label>
                  <p className="text-sm text-muted-foreground">{currentBand?.name || 'No band'}</p>
                </div>
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={handleLeaveBand}
                >
                  Leave Band
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Profile</h2>
            </CardHeader>
            <CardContent className="space-y-4">
            
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Display Name</label>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    className="profile-input"
                  />
                ) : (
                  <p className="setting-description">
                    {profile?.display_name || 'Not set'}
                  </p>
                )}
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Instrument</label>
                {isEditingProfile ? (
                  <select
                    value={editInstrument}
                    onChange={(e) => setEditInstrument(e.target.value)}
                    className="profile-input"
                  >
                    <option value="">Select instrument</option>
                    <option value="Guitar">Guitar</option>
                    <option value="Bass">Bass</option>
                    <option value="Drums">Drums</option>
                    <option value="Vocals">Vocals</option>
                    <option value="Keyboard">Keyboard</option>
                    <option value="Saxophone">Saxophone</option>
                    <option value="Trumpet">Trumpet</option>
                    <option value="Violin">Violin</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="setting-description">
                    {profile?.instrument || 'Not set'}
                  </p>
                )}
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Photo</label>
                <p className="setting-description">
                  {profile?.photo_url ? 'Photo uploaded' : 'No photo uploaded'}
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="photo-upload-btn">
                📷 {profile?.photo_url ? 'Change Photo' : 'Upload Photo'}
              </label>
            </div>

            <div className="profile-actions">
              {isEditingProfile ? (
                <>
                  <button onClick={handleSaveProfile} className="save-btn">
                    Save Changes
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditingProfile(false);
                      setEditDisplayName(profile?.display_name || '');
                      setEditInstrument(profile?.instrument || '');
                    }} 
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditingProfile(true)} 
                  className="edit-btn"
                >
                  Edit Profile
                </button>
              )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (selectedSong) {
    const chordsFromLyrics = extractChordsFromLyrics(selectedSong.lyrics || '');
    const lyricsWithChords = parseLyricsWithChords(selectedSong.lyrics || '');
    
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedSong(null)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setEditArtist(selectedSong.artist || '');
                  setEditDuration(formatDuration(selectedSong.duration));
                  setEditTempo(selectedSong.tempo?.toString() || '120');
                  setIsEditingDetails(true);
                }}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => deleteSong(selectedSong.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Song Info Card */}
        <div className="p-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  {selectedSong.thumbnail_url ? (
                    <img 
                      src={selectedSong.thumbnail_url} 
                      alt={`${selectedSong.name} thumbnail`} 
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                      <Music className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Title and Artist */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold leading-tight">
                        {selectedSong.name}
                      </h1>
                      <p className="text-muted-foreground mt-1">
                        {selectedSong.artist || 'Unknown Artist'}
                      </p>
                    </div>
                    
                    {/* Action Icons */}
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Metadata */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary">Intermediate</Badge>
                <Badge variant="outline">{selectedSong.tempo || 120} BPM</Badge>
                <Badge variant="outline">{formatDuration(selectedSong.duration)}</Badge>
              </div>
            </CardHeader>

            {isEditingDetails && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Artist</label>
                    <input
                      type="text"
                      value={editArtist}
                      onChange={(e) => setEditArtist(e.target.value)}
                      placeholder="Enter artist name"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tempo (BPM)</label>
                    <input
                      type="number"
                      value={editTempo}
                      onChange={(e) => setEditTempo(e.target.value)}
                      placeholder="120"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration</label>
                    <input
                      type="text"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      placeholder="3:00"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
                
                {/* Thumbnail Upload Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Thumbnail Image</label>
                  <div className="flex items-center gap-4">
                    {selectedSong.thumbnail_url ? (
                      <img 
                        src={selectedSong.thumbnail_url} 
                        alt="Current thumbnail" 
                        className="h-12 w-12 rounded-md object-cover" 
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                        <Music className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedImage(file);
                          }
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      {selectedImage && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected: {selectedImage.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => {
                    setIsEditingDetails(false);
                    setSelectedImage(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveDetails}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Generated Chord Progression Section */}
        {selectedSong.chords && (
          <div className="p-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Chord Progression</h3>
                  <Badge variant="secondary">Auto-generated</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-lg font-mono font-medium text-center">
                    {selectedSong.chords}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Chords Reference Section */}
        {chordsFromLyrics.length > 0 && (
          <div className="p-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Chords</h3>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    Show All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {chordsFromLyrics.slice(0, 6).map((chord, index) => (
                    <div key={index} className="flex flex-col items-center space-y-2">
                      <div className="text-sm font-medium">{chord}</div>
                      <div className="flex items-center justify-center">
                        <SimpleChordDiagram chord={chord} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lyrics with Chords Section */}
        <div className="p-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Lyrics</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setEditLyrics(selectedSong.lyrics || '');
                    setIsAddingLyrics(true);
                  }}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  {selectedSong.lyrics ? 'Edit' : 'Add'}
                </Button>
              </div>
            </CardHeader>
          
            {isAddingLyrics ? (
              <CardContent className="space-y-4">
                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                  💡 Use [G], [Em], [C], etc. to add chords above lyrics
                </div>
                <textarea
                  value={editLyrics}
                  onChange={(e) => setEditLyrics(e.target.value)}
                  placeholder="Enter lyrics with chords like: [G]Hello [Em]world, [C]how are [D]you?"
                  rows={15}
                  className="min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddingLyrics(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveLyrics}>
                    Save Lyrics
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent>
                {selectedSong.lyrics ? (
                  <div className="space-y-4">
                    {lyricsWithChords.map((line, lineIndex) => (
                      <div key={lineIndex} className="leading-8">
                        {line.map((part, partIndex) => (
                          <span key={partIndex} className="relative">
                            {part.type === 'chord' ? (
                              <span className="absolute -top-5 text-xs font-semibold text-primary">
                                {part.content}
                              </span>
                            ) : (
                              <span className="font-mono text-sm">{part.content}</span>
                            )}
                          </span>
                        ))}
                        {line.length === 0 && <br />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Music className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No lyrics added yet</p>
                    <Button 
                      onClick={() => {
                        setEditLyrics('');
                        setIsAddingLyrics(true);
                      }}
                      variant="outline"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Add Lyrics
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Notes Section */}
        <div className="p-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Notes</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setEditNotes(selectedSong.notes || '');
                    setIsAddingNotes(true);
                  }}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  {selectedSong.notes ? 'Edit' : 'Add'}
                </Button>
              </div>
            </CardHeader>
            
            {isAddingNotes ? (
              <CardContent className="space-y-4">
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add performance notes, key changes, arrangement details..."
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddingNotes(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveNotes}>
                    Save Notes
                  </Button>
                </div>
              </CardContent>
            ) : selectedSong.notes ? (
              <CardContent>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedSong.notes}
                </div>
              </CardContent>
            ) : null}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Modern Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">{currentBand?.name || 'Setlist Manager'}</h1>
            {/* Setlist selector */}
            {currentSetlist && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSetlistSelector(!showSetlistSelector)}
                  className="gap-2 text-muted-foreground"
                >
                  <Calendar className="h-4 w-4" />
                  {currentSetlist.name}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant={isReordering ? "default" : "ghost"} 
              size="icon" 
              onClick={() => setIsReordering(!isReordering)}
              title={isReordering ? "Stop reordering" : "Reorder songs"}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentView('account')}
            >
              <User className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentView('settings')}
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        
      </header>
      
      
      {/* Create Setlist Modal */}
      {showCreateSetlist && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowCreateSetlist(false);
            setNewSetlistName('');
            setNewSetlistDescription('');
            setNewSetlistVenue('');
          }}
        >
          <div 
            className="w-full max-w-md mx-4 bg-background border rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Create New Setlist</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowCreateSetlist(false);
                    setNewSetlistName('');
                    setNewSetlistDescription('');
                    setNewSetlistVenue('');
                  }}
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Name</label>
                  <input
                    type="text"
                    value={newSetlistName}
                    onChange={(e) => setNewSetlistName(e.target.value)}
                    placeholder="e.g., Spring Concert 2024"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-1">Venue (optional)</label>
                  <input
                    type="text"
                    value={newSetlistVenue}
                    onChange={(e) => setNewSetlistVenue(e.target.value)}
                    placeholder="e.g., The Blue Note"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-1">Description (optional)</label>
                  <textarea
                    value={newSetlistDescription}
                    onChange={(e) => setNewSetlistDescription(e.target.value)}
                    placeholder="e.g., Acoustic set for spring fundraiser"
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateSetlist(false);
                      setNewSetlistName('');
                      setNewSetlistDescription('');
                      setNewSetlistVenue('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createSetlist}
                    disabled={!newSetlistName.trim()}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Setlist Selector Modal */}
      {showSetlistSelector && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50"
          onClick={() => setShowSetlistSelector(false)}
        >
          <div 
            className="w-full max-w-md mx-4 bg-background border rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Switch Setlist</h3>
                <Button
                  size="sm"
                  onClick={(e) => {
                    console.log('New button clicked!');
                    e.stopPropagation();
                    setShowSetlistSelector(false);
                    setShowCreateSetlist(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {setlists.map((setlist) => (
                  <div
                    key={setlist.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentSetlist?.id === setlist.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => switchSetlist(setlist)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{setlist.name}</h4>
                        {setlist.venue && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="text-xs text-muted-foreground truncate">
                              {setlist.venue}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {setlist.total_duration || '0:00'}
                          </div>
                          <span>•</span>
                          <span>{setlist.song_count || 0} songs</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {setlists.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No setlists yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isReordering ? (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
        <div className="p-4">
          {!currentSetlist ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  No setlist selected
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first setlist to start adding songs
                </p>
                <Button onClick={(e) => { e.stopPropagation(); setShowCreateSetlist(true); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Setlist
                </Button>
              </CardContent>
            </Card>
          ) : songs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Music className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  No songs in your setlist yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Add your first song above!
                </p>
              </CardContent>
            </Card>
          ) : (
            <SortableContext 
              items={songs.map(song => song.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {songs.map((song) => (
                  <SortableItem
                    key={song.id}
                    id={song.id}
                    song={song}
                    onSongClick={setSelectedSong}
                    formatDuration={formatDuration}
                    showDragHandle={isReordering}
                  />
                ))}
                
                {/* Add Song Button */}
                <div className="flex justify-center mt-4">
                  <div className="relative">
                    {!showAddSongMenu ? (
                      <button
                        onClick={() => setShowAddSongMenu(true)}
                        className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center text-primary-foreground shadow-lg transition-colors"
                      >
                        <Plus className="h-6 w-6" />
                      </button>
                    ) : (
                      <div className="flex flex-col items-center space-y-3">
                        {/* Close button */}
                        <button
                          onClick={() => {
                            setShowAddSongMenu(false);
                            setAddSongMethod(null);
                          }}
                          className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                        >
                          <Plus className="h-4 w-4 rotate-45" />
                        </button>
                        
                        {!addSongMethod ? (
                          /* Menu options */
                          <div className="flex space-x-4">
                            <button
                              onClick={() => setAddSongMethod('search')}
                              className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-card hover:bg-accent transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                <Globe className="h-5 w-5" />
                              </div>
                              <span className="text-xs font-medium">Search Web</span>
                            </button>
                            
                            <button
                              onClick={() => setAddSongMethod('library')}
                              className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-card hover:bg-accent transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                                <Library className="h-5 w-5" />
                              </div>
                              <span className="text-xs font-medium">From Library</span>
                            </button>
                            
                            <button
                              onClick={() => setAddSongMethod('create')}
                              className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-card hover:bg-accent transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                                <FileText className="h-5 w-5" />
                              </div>
                              <span className="text-xs font-medium">Create New</span>
                            </button>
                          </div>
                        ) : (
                          /* Selected method interface */
                          <div className="w-full max-w-md">
                            {addSongMethod === 'create' && (
                              <div className="space-y-3">
                                <h3 className="text-lg font-medium text-center">Create New Song</h3>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={newSongName}
                                    onChange={(e) => setNewSongName(e.target.value)}
                                    placeholder="Enter song name..."
                                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && addSong()}
                                  />
                                  <Button onClick={addSong} disabled={!newSongName.trim()}>
                                    Create
                                  </Button>
                                </div>
                              </div>
                            )}
                            
                            {addSongMethod === 'search' && (
                              <div className="space-y-3">
                                <h3 className="text-lg font-medium text-center">Search Songs</h3>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for artist and song..."
                                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSearch()}
                                  />
                                  <Button onClick={handleSearch} disabled={!searchQuery.trim() || isSearching}>
                                    {isSearching ? 'Searching...' : 'Search'}
                                  </Button>
                                </div>
                                
                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                  <div className="max-h-80 overflow-y-auto space-y-2">
                                    <h4 className="text-sm font-medium text-muted-foreground">Search Results:</h4>
                                    {searchResults.map((track) => (
                                      <div
                                        key={track.id}
                                        className="flex items-center space-x-3 p-3 rounded-lg bg-card hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => addSongFromSpotify(track)}
                                      >
                                        <div className="flex-shrink-0">
                                          {track.album.images && track.album.images[0] ? (
                                            <img
                                              src={track.album.images[track.album.images.length - 1]?.url}
                                              alt={track.album.name}
                                              className="w-12 h-12 rounded-md object-cover"
                                            />
                                          ) : (
                                            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                                              <Music className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-medium text-sm truncate">{track.name}</h4>
                                          <p className="text-sm text-muted-foreground truncate">
                                            {track.artists.map((artist: any) => artist.name).join(', ')}
                                          </p>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {track.album.name} • {new Date(track.album.release_date).getFullYear()}
                                          </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                          <Plus className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {searchResults.length === 0 && searchQuery && !isSearching && (
                                  <div className="p-4 rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
                                    No results found for "{searchQuery}"
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {addSongMethod === 'library' && (
                              <div className="space-y-3">
                                <h3 className="text-lg font-medium text-center">From Library</h3>
                                <div className="p-4 rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
                                  Library functionality coming soon...
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SortableContext>
          )}
        </div>
          <DragOverlay>
            {activeId ? (
              <Card className="shadow-lg rotate-3 opacity-90">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col space-y-1 p-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                    </div>
                    
                    {(() => {
                      const draggedSong = songs.find(s => s.id === activeId);
                      return draggedSong ? (
                        <>
                          <div className="flex-shrink-0">
                            {draggedSong.thumbnail_url ? (
                              <img 
                                src={draggedSong.thumbnail_url} 
                                alt={`${draggedSong.name} thumbnail`} 
                                className="w-12 h-12 rounded-md object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                                <Music className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{draggedSong.name}</h3>
                            <p className="text-sm text-muted-foreground truncate">{draggedSong.artist || 'Unknown Artist'}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs px-2 py-0">
                                {formatDuration(draggedSong.duration)}
                              </Badge>
                              {draggedSong.tempo && (
                                <Badge variant="outline" className="text-xs px-2 py-0">
                                  {draggedSong.tempo} BPM
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">v.1</Badge>
                          </div>
                        </>
                      ) : null;
                    })()
                    }
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="p-4">
          {!currentSetlist ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  No setlist selected
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first setlist to start adding songs
                </p>
                <Button onClick={(e) => { e.stopPropagation(); setShowCreateSetlist(true); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Setlist
                </Button>
              </CardContent>
            </Card>
          ) : songs.length === 0 ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Music className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    No songs in your setlist yet
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your first song to get started
                  </p>
                  <Button 
                    onClick={() => setShowAddSongMenu(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Song
                  </Button>
                </CardContent>
              </Card>
              
              {/* Add Song Menu for Empty State */}
              {showAddSongMenu && (
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="flex flex-col items-center space-y-3">
                      {/* Close button */}
                      <button
                        onClick={() => {
                          setShowAddSongMenu(false);
                          setAddSongMethod(null);
                        }}
                        className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                      >
                        <Plus className="h-4 w-4 rotate-45" />
                      </button>
                      
                      {!addSongMethod ? (
                        /* Menu options */
                        <div className="flex space-x-4">
                          <button
                            onClick={() => setAddSongMethod('search')}
                            className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-card hover:bg-accent transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                              <Globe className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium">Search Web</span>
                          </button>
                          
                          <button
                            onClick={() => setAddSongMethod('library')}
                            className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-card hover:bg-accent transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                              <Library className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium">From Library</span>
                          </button>
                          
                          <button
                            onClick={() => setAddSongMethod('create')}
                            className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-card hover:bg-accent transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                              <FileText className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium">Create New</span>
                          </button>
                        </div>
                      ) : (
                        /* Selected method interface */
                        <div className="w-full max-w-md">
                          {addSongMethod === 'create' && (
                            <div className="space-y-3">
                              <h3 className="text-lg font-medium text-center">Create New Song</h3>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newSongName}
                                  onChange={(e) => setNewSongName(e.target.value)}
                                  placeholder="Enter song name..."
                                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && addSong()}
                                />
                                <Button onClick={addSong} disabled={!newSongName.trim()}>
                                  Create
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {addSongMethod === 'search' && (
                            <div className="space-y-3">
                              <h3 className="text-lg font-medium text-center">Search Songs</h3>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  placeholder="Search for artist and song..."
                                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSearch()}
                                />
                                <Button onClick={handleSearch} disabled={!searchQuery.trim() || isSearching}>
                                  {isSearching ? 'Searching...' : 'Search'}
                                </Button>
                              </div>
                              
                              {/* Search Results */}
                              {searchResults.length > 0 && (
                                <div className="max-h-80 overflow-y-auto space-y-2">
                                  <h4 className="text-sm font-medium text-muted-foreground">Search Results:</h4>
                                  {searchResults.map((track) => (
                                    <div
                                      key={track.id}
                                      className="flex items-center space-x-3 p-3 rounded-lg bg-card hover:bg-accent transition-colors cursor-pointer"
                                      onClick={() => addSongFromSpotify(track)}
                                    >
                                      <div className="flex-shrink-0">
                                        {track.album.images && track.album.images[0] ? (
                                          <img
                                            src={track.album.images[track.album.images.length - 1]?.url}
                                            alt={track.album.name}
                                            className="w-12 h-12 rounded-md object-cover"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                                            <Music className="w-6 h-6 text-muted-foreground" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm truncate">{track.name}</h4>
                                        <p className="text-sm text-muted-foreground truncate">
                                          {track.artists.map((artist: any) => artist.name).join(', ')}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {track.album.name} • {new Date(track.album.release_date).getFullYear()}
                                        </p>
                                      </div>
                                      <div className="flex-shrink-0">
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {searchResults.length === 0 && searchQuery && !isSearching && (
                                <div className="p-4 rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
                                  No results found for "{searchQuery}"
                                </div>
                              )}
                            </div>
                          )}
                          
                          {addSongMethod === 'library' && (
                            <div className="space-y-3">
                              <h3 className="text-lg font-medium text-center">From Library</h3>
                              <Button
                                onClick={() => setShowSongLibrary(true)}
                                className="w-full"
                              >
                                Browse Song Library
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {songs.map((song) => (
                <SortableItem
                  key={song.id}
                  id={song.id}
                  song={song}
                  onSongClick={setSelectedSong}
                  formatDuration={formatDuration}
                  showDragHandle={false}
                />
              ))}
              
              {/* Add Song Button */}
              <div className="flex justify-center mt-4">
                <div className="relative">
                  {!showAddSongMenu ? (
                    <button
                      onClick={() => setShowAddSongMenu(true)}
                      className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center text-primary-foreground shadow-lg transition-colors"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                  ) : (
                    <div className="flex flex-col items-center space-y-3">
                      {/* Close button */}
                      <button
                        onClick={() => {
                          setShowAddSongMenu(false);
                          setAddSongMethod(null);
                        }}
                        className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                      >
                        <Plus className="h-4 w-4 rotate-45" />
                      </button>
                      
                      {!addSongMethod ? (
                        /* Menu options */
                        <div className="flex space-x-4">
                          <button
                            onClick={() => setAddSongMethod('search')}
                            className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-card hover:bg-accent transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                              <Globe className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium">Search Web</span>
                          </button>
                          
                          <button
                            onClick={() => setAddSongMethod('library')}
                            className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-card hover:bg-accent transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                              <Library className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium">From Library</span>
                          </button>
                          
                          <button
                            onClick={() => setAddSongMethod('create')}
                            className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-card hover:bg-accent transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                              <FileText className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium">Create New</span>
                          </button>
                        </div>
                      ) : (
                        /* Selected method interface */
                        <div className="w-full max-w-md">
                          {addSongMethod === 'create' && (
                            <div className="space-y-3">
                              <h3 className="text-lg font-medium text-center">Create New Song</h3>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newSongName}
                                  onChange={(e) => setNewSongName(e.target.value)}
                                  placeholder="Enter song name..."
                                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && addSong()}
                                />
                                <Button onClick={addSong} disabled={!newSongName.trim()}>
                                  Create
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {addSongMethod === 'search' && (
                            <div className="space-y-3">
                              <h3 className="text-lg font-medium text-center">Search Songs</h3>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  placeholder="Search for artist and song..."
                                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSearch()}
                                />
                                <Button onClick={handleSearch} disabled={!searchQuery.trim() || isSearching}>
                                  {isSearching ? 'Searching...' : 'Search'}
                                </Button>
                              </div>
                              
                              {/* Search Results */}
                              {searchResults.length > 0 && (
                                <div className="max-h-80 overflow-y-auto space-y-2">
                                  <h4 className="text-sm font-medium text-muted-foreground">Search Results:</h4>
                                  {searchResults.map((track) => (
                                    <div
                                      key={track.id}
                                      className="flex items-center space-x-3 p-3 rounded-lg bg-card hover:bg-accent transition-colors cursor-pointer"
                                      onClick={() => addSongFromSpotify(track)}
                                    >
                                      <div className="flex-shrink-0">
                                        {track.album.images && track.album.images[0] ? (
                                          <img
                                            src={track.album.images[track.album.images.length - 1]?.url}
                                            alt={track.album.name}
                                            className="w-12 h-12 rounded-md object-cover"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                                            <Music className="w-6 h-6 text-muted-foreground" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm truncate">{track.name}</h4>
                                        <p className="text-sm text-muted-foreground truncate">
                                          {track.artists.map((artist: any) => artist.name).join(', ')}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {track.album.name} • {new Date(track.album.release_date).getFullYear()}
                                        </p>
                                      </div>
                                      <div className="flex-shrink-0">
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {searchResults.length === 0 && searchQuery && !isSearching && (
                                <div className="p-4 rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
                                  No results found for "{searchQuery}"
                                </div>
                              )}
                            </div>
                          )}
                          
                          {addSongMethod === 'library' && (
                            <div className="space-y-3">
                              <h3 className="text-lg font-medium text-center">From Library</h3>
                              <Button
                                onClick={() => setShowSongLibrary(true)}
                                className="w-full"
                              >
                                Browse Song Library
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Song Library Modal */}
      {showSongLibrary && (
        <SongLibrary
          onSongSelect={addSongFromLibrary}
          onClose={() => setShowSongLibrary(false)}
        />
      )}

      {/* Modern Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  return user ? <SetlistManager /> : <Auth />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;