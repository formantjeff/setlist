import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase, Song, Profile, Band } from './supabase';
import { AuthProvider, useAuth } from './AuthContext';
import { Auth } from './Auth';
import { UserAvatar } from './UserAvatar';
import { ThemeProvider } from './ThemeContext';
import { Settings as SettingsComponent } from './Settings';
import { BandSelection } from './BandSelection';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { ArrowLeft, MoreHorizontal, Edit3, Trash2, Music, Heart, Share2, RotateCcw, Plus, Settings as SettingsIcon, User, Moon, Sun, Search } from 'lucide-react';
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
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  song: Song;
  onSongClick: (song: Song) => void;
  formatDuration: (duration?: string) => string;
  showDragHandle: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ song, onSongClick, formatDuration, showDragHandle }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

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
              <img 
                src={song.thumbnail_url} 
                alt={`${song.name} thumbnail`} 
                className="w-12 h-12 rounded-md object-cover"
              />
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
      fetchSongs();
      fetchBand();
    }
  }, [userBandId]);

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
    if (!user || !userBandId) return;
    
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('band_id', userBandId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching songs:', error);
    } else {
      setSongs(data || []);
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
    if (!newSongName.trim() || !user || !userBandId) return;

    // Get the highest position to add the new song at the end
    const maxPosition = songs.length > 0 ? Math.max(...songs.map(s => s.position || 0)) + 1 : 0;

    const { data, error } = await supabase
      .from('songs')
      .insert([{ 
        name: newSongName.trim(), 
        user_id: user.id,
        band_id: userBandId,
        position: maxPosition
      }])
      .select();

    if (error) {
      console.error('Error adding song:', error);
    } else {
      setSongs([...songs, ...data]);
      setNewSongName('');
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

  const handleSaveDetails = () => {
    if (selectedSong) {
      updateSong(selectedSong.id, { 
        artist: editArtist.trim() || undefined,
        duration: editDuration,
        tempo: parseInt(editTempo) || 120
      });
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
      const filePath = `song-thumbnails/${fileName}`;

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

      return publicUrl;
    } catch (error) {
      console.error('Unexpected error uploading image:', error);
      alert('An unexpected error occurred while uploading the image. Please try again.');
      return null;
    }
  };

  const formatDuration = (duration?: string): string => {
    if (!duration) return '3:00';
    // Convert PostgreSQL interval to MM:SS format
    if (duration.includes(':')) {
      const parts = duration.split(':');
      if (parts.length >= 2) {
        return `${parts[1]}:${parts[2].split('.')[0]}`;
      }
    }
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
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditingDetails(false)}>
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
                      <div className="w-12 h-16 bg-muted rounded border flex items-center justify-center">
                        <div className="text-xs text-muted-foreground">•••</div>
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
      
      {/* Add Song Section */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={newSongName}
            onChange={(e) => setNewSongName(e.target.value)}
            placeholder="Add song name..."
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && addSong()}
          />
          <Button onClick={addSong} disabled={!newSongName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Song
          </Button>
        </div>
      </div>

      {isReordering ? (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
        <div className="p-4">
          {songs.length === 0 ? (
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
                    song={song}
                    onSongClick={setSelectedSong}
                    formatDuration={formatDuration}
                    showDragHandle={isReordering}
                  />
                ))}
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
          {songs.length === 0 ? (
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
            <div className="space-y-2">
              {songs.map((song) => (
                <SortableItem
                  key={song.id}
                  song={song}
                  onSongClick={setSelectedSong}
                  formatDuration={formatDuration}
                  showDragHandle={false}
                />
              ))}
            </div>
          )}
        </div>
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