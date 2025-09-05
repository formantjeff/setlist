import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase, Song, Profile, Band } from './supabase';
import { AuthProvider, useAuth } from './AuthContext';
import { Auth } from './Auth';
import { UserAvatar } from './UserAvatar';
import { ThemeProvider } from './ThemeContext';
import { Settings } from './Settings';
import { ModeProvider, useMode } from './ModeContext';
import { BandSelection } from './BandSelection';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const SetlistManager: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [newSongName, setNewSongName] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isAddingLyrics, setIsAddingLyrics] = useState(false);
  const [isAddingChords, setIsAddingChords] = useState(false);
  const [editLyrics, setEditLyrics] = useState('');
  const [editChords, setEditChords] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDuration, setEditDuration] = useState('3:00');
  const [editTempo, setEditTempo] = useState('120');
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isAddingNotes, setIsAddingNotes] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'songs' | 'settings' | 'account'>('songs');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editInstrument, setEditInstrument] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [currentBand, setCurrentBand] = useState<Band | null>(null);
  const [userBandId, setUserBandId] = useState<string | null>(null);
  const { user } = useAuth();
  const { mode, toggleMode } = useMode();

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

  // Drag and drop handler
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const startIndex = result.source.index;
    const endIndex = result.destination.index;

    if (startIndex === endIndex) {
      return;
    }

    console.log(`Moving song from position ${startIndex} to ${endIndex}`);

    // Reorder songs array
    const newSongs = Array.from(songs);
    const [reorderedSong] = newSongs.splice(startIndex, 1);
    newSongs.splice(endIndex, 0, reorderedSong);

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
  };

  const handleSaveLyrics = () => {
    if (selectedSong) {
      updateSong(selectedSong.id, { lyrics: editLyrics });
      setIsAddingLyrics(false);
    }
  };

  const handleSaveChords = () => {
    if (selectedSong) {
      updateSong(selectedSong.id, { chords: editChords });
      setIsAddingChords(false);
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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    if (!user || !selectedSong) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedSong.id}-${Date.now()}.${fileExt}`;
      const filePath = `song-thumbnails/${fileName}`;

      const { data, error } = await supabase.storage
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

  const handleSaveWithImage = async () => {
    if (!selectedSong) return;

    let thumbnailUrl = selectedSong.thumbnail_url;

    // Upload new image if selected
    if (selectedImage) {
      const uploadedUrl = await uploadImageToSupabase(selectedImage);
      if (uploadedUrl) {
        thumbnailUrl = uploadedUrl;
      }
    }

    // Save all details including the new image URL
    updateSong(selectedSong.id, { 
      artist: editArtist.trim() || undefined,
      duration: editDuration,
      tempo: parseInt(editTempo) || 120,
      thumbnail_url: thumbnailUrl
    });

    // Reset image states
    setSelectedImage(null);
    setImagePreview(null);
    setIsEditingDetails(false);
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
    return <Settings onBack={() => setCurrentView('songs')} />;
  }

  // Account view
  if (currentView === 'account') {
    return (
      <div className="App" data-mode={mode}>
        <header className="header">
          <button onClick={() => setCurrentView('songs')} className="back-btn">
            ← Back
          </button>
          <h1>Account</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <div className="settings-container">
          <div className="settings-section">
            <h2>Account Information</h2>
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Email</label>
                <p className="setting-description">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2>Band Information</h2>
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Current Band</label>
                <p className="setting-description">{currentBand?.name || 'No band'}</p>
              </div>
              <button 
                onClick={handleLeaveBand}
                className="delete-btn"
              >
                Leave Band
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h2>Profile</h2>
            
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
          </div>
        </div>
      </div>
    );
  }

  if (selectedSong) {
    return (
      <div className="App" data-mode={mode}>
        <header className="header">
          <button onClick={() => setSelectedSong(null)} className="back-btn">
            ← Back
          </button>
          <h1>{selectedSong.name}</h1>
          {mode === 'edit' && (
            <button 
              onClick={() => deleteSong(selectedSong.id)} 
              className="delete-btn"
            >
              Delete
            </button>
          )}
        </header>
        
        <div className="song-detail">
          {mode === 'edit' && (
            <div className="section">
              <div className="section-header">
                <h3>Song Details</h3>
                <button 
                  onClick={() => {
                    setEditArtist(selectedSong.artist || '');
                    setEditDuration(formatDuration(selectedSong.duration));
                    setEditTempo(selectedSong.tempo?.toString() || '120');
                    setSelectedImage(null);
                    setImagePreview(null);
                    setIsEditingDetails(true);
                  }}
                  className="edit-btn"
                >
                  Edit
                </button>
              </div>
              {isEditingDetails ? (
                <div className="edit-section">
                  <div className="detail-fields">
                    <div className="detail-field">
                      <label>Artist</label>
                      <input
                        type="text"
                        value={editArtist}
                        onChange={(e) => setEditArtist(e.target.value)}
                        placeholder="Enter artist name"
                        className="detail-input"
                      />
                    </div>
                    <div className="detail-field">
                      <label>Duration (MM:SS)</label>
                      <input
                        type="text"
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        placeholder="3:00"
                        className="detail-input"
                      />
                    </div>
                    <div className="detail-field">
                      <label>Tempo (BPM)</label>
                      <input
                        type="number"
                        value={editTempo}
                        onChange={(e) => setEditTempo(e.target.value)}
                        placeholder="120"
                        className="detail-input"
                      />
                    </div>
                    <div className="detail-field">
                      <label>Thumbnail</label>
                      {selectedSong.thumbnail_url && !imagePreview && (
                        <div className="current-image">
                          <img src={selectedSong.thumbnail_url} alt="Current thumbnail" className="thumbnail-preview" />
                          <p className="image-label">Current Image</p>
                        </div>
                      )}
                      {imagePreview && (
                        <div className="current-image">
                          <img src={imagePreview} alt="New thumbnail preview" className="thumbnail-preview" />
                          <p className="image-label">New Image Preview</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        {...(isMobile() && { capture: 'environment' })}
                        style={{ display: 'none' }}
                        id="thumbnail-upload"
                      />
                      <label htmlFor="thumbnail-upload" className="photo-upload-btn">
                        📷 {isMobile() ? 'Take Photo' : 'Choose Image'}
                      </label>
                    </div>
                  </div>
                  <div className="edit-buttons">
                    <button onClick={handleSaveWithImage} className="save-btn">Save</button>
                    <button onClick={() => {
                      setIsEditingDetails(false);
                      setSelectedImage(null);
                      setImagePreview(null);
                    }} className="cancel-btn">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="content">
                  <div className="song-meta-display">
                    {selectedSong.artist && (
                      <div className="meta-item">
                        <span className="meta-label">Artist:</span>
                        <span className="meta-value">{selectedSong.artist}</span>
                      </div>
                    )}
                    <div className="meta-item">
                      <span className="meta-label">Duration:</span>
                      <span className="meta-value">{formatDuration(selectedSong.duration)}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Tempo:</span>
                      <span className="meta-value">{selectedSong.tempo || 120} BPM</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="section">
            <div className="section-header">
              <h3>Lyrics</h3>
              {mode === 'edit' && (
                <button 
                  onClick={() => {
                    setEditLyrics(selectedSong.lyrics || '');
                    setIsAddingLyrics(true);
                  }}
                  className="edit-btn"
                >
                  {selectedSong.lyrics ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {isAddingLyrics ? (
              <div className="edit-section">
                <textarea
                  value={editLyrics}
                  onChange={(e) => setEditLyrics(e.target.value)}
                  placeholder="Enter lyrics..."
                  rows={10}
                />
                <div className="edit-buttons">
                  <button onClick={handleSaveLyrics} className="save-btn">Save</button>
                  <button onClick={() => setIsAddingLyrics(false)} className="cancel-btn">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="content">
                {selectedSong.lyrics ? (
                  <pre>{selectedSong.lyrics}</pre>
                ) : (
                  <p className="placeholder">No lyrics added yet</p>
                )}
              </div>
            )}
          </div>

          <div className="section">
            <div className="section-header">
              <h3>Chords</h3>
              {mode === 'edit' && (
                <button 
                  onClick={() => {
                    setEditChords(selectedSong.chords || '');
                    setIsAddingChords(true);
                  }}
                  className="edit-btn"
                >
                  {selectedSong.chords ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {isAddingChords ? (
              <div className="edit-section">
                <textarea
                  value={editChords}
                  onChange={(e) => setEditChords(e.target.value)}
                  placeholder="Enter chords..."
                  rows={10}
                />
                <div className="edit-buttons">
                  <button onClick={handleSaveChords} className="save-btn">Save</button>
                  <button onClick={() => setIsAddingChords(false)} className="cancel-btn">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="content">
                {selectedSong.chords ? (
                  <pre>{selectedSong.chords}</pre>
                ) : (
                  <p className="placeholder">No chords added yet</p>
                )}
              </div>
            )}
          </div>

          <div className="section">
            <div className="section-header">
              <h3>Notes</h3>
              {mode === 'edit' && (
                <button 
                  onClick={() => {
                    setEditNotes(selectedSong.notes || '');
                    setIsAddingNotes(true);
                  }}
                  className="edit-btn"
                >
                  {selectedSong.notes ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {isAddingNotes ? (
              <div className="edit-section">
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Enter notes about this song..."
                  rows={6}
                />
                <div className="edit-buttons">
                  <button onClick={handleSaveNotes} className="save-btn">Save</button>
                  <button onClick={() => setIsAddingNotes(false)} className="cancel-btn">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="content">
                {selectedSong.notes ? (
                  <pre>{selectedSong.notes}</pre>
                ) : (
                  <p className="placeholder">No notes added yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App" data-mode={mode}>
      <header className="header">
        <h1>{currentBand?.name || 'Setlist Manager'}</h1>
        <div className="header-controls">
          <UserAvatar 
            onAccountClick={() => setCurrentView('account')}
            onSettingsClick={() => setCurrentView('settings')}
          />
        </div>
      </header>
      
      {mode === 'edit' && (
        <div className="add-song">
          <input
            type="text"
            value={newSongName}
            onChange={(e) => setNewSongName(e.target.value)}
            placeholder="Enter song name..."
            onKeyPress={(e) => e.key === 'Enter' && addSong()}
          />
          <button onClick={addSong} disabled={!newSongName.trim()}>
            Add Song
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="songs-list">
          {songs.length === 0 ? (
            <p className="placeholder">
              {mode === 'performance' 
                ? 'No songs in your setlist yet. Switch to Edit mode to add songs!' 
                : 'No songs in your setlist yet. Add one above!'}
            </p>
          ) : (
            <Droppable droppableId="songs" isDropDisabled={mode !== 'edit'}>
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={snapshot.isDraggingOver ? 'drag-over' : ''}
                >
                  {songs.map((song, index) => (
                    <Draggable 
                      key={song.id} 
                      draggableId={song.id} 
                      index={index}
                      isDragDisabled={mode !== 'edit'}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`song-item ${mode === 'edit' ? 'draggable' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                          onClick={() => {
                            if (!snapshot.isDragging) {
                              setSelectedSong(song);
                            }
                          }}
                        >
                          {mode === 'edit' && (
                            <div 
                              {...provided.dragHandleProps}
                              className="drag-handle" 
                              title="Drag to reorder songs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="drag-lines">
                                <div></div>
                                <div></div>
                                <div></div>
                              </div>
                            </div>
                          )}
                          <div className="song-artwork">
                            {song.thumbnail_url ? (
                              <img 
                                src={song.thumbnail_url} 
                                alt={`${song.name} thumbnail`} 
                                className="song-thumbnail"
                              />
                            ) : (
                              <div className="song-placeholder">🎵</div>
                            )}
                          </div>
                          <div className="song-content">
                            <h3>{song.name}</h3>
                            <p className="song-artist">{song.artist || 'Unknown Artist'}</p>
                            <div className="song-meta">
                              <span className="song-duration">{formatDuration(song.duration)}</span>
                              {song.tempo && <span className="song-tempo">{song.tempo} BPM</span>}
                            </div>
                          </div>
                          <div className="song-version">
                            v.1
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>
      </DragDropContext>
      
      <footer className="footer">
        <button 
          className={`edit-mode-btn ${mode === 'edit' ? 'active' : ''}`}
          onClick={toggleMode}
          title={mode === 'edit' ? 'Exit edit mode' : 'Enter edit mode'}
        >
          {mode === 'edit' ? '✓' : '✏️'}
        </button>
      </footer>
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
      <ModeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ModeProvider>
    </ThemeProvider>
  );
};

export default App;