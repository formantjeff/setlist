import React, { useState, useEffect } from 'react';
import { supabase, Band } from './supabase';
import { useAuth } from './AuthContext';

interface BandSelectionProps {
  onBandSelected: (bandId: string) => void;
}

export const BandSelection: React.FC<BandSelectionProps> = ({ onBandSelected }) => {
  const [view, setView] = useState<'select' | 'create' | 'join'>('select');
  const [bands, setBands] = useState<Band[]>([]);
  const [searchResults, setSearchResults] = useState<Band[]>([]);
  const [newBandName, setNewBandName] = useState('');
  const [newBandDescription, setNewBandDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchUserBands();
  }, [user]);

  const fetchUserBands = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('band_members')
      .select(`
        bands (
          id,
          name,
          description,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user bands:', error);
    } else {
      const userBands = data?.map((item: any) => item.bands).filter(Boolean) || [];
      setBands(userBands as Band[]);
    }
  };

  const createBand = async () => {
    if (!newBandName.trim() || !user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('bands')
      .insert([{
        name: newBandName.trim(),
        description: newBandDescription.trim() || undefined,
        created_by: user.id
      }])
      .select();

    if (error) {
      console.error('Error creating band:', error);
    } else if (data?.[0]) {
      onBandSelected(data[0].id);
    }
    setLoading(false);
  };

  const searchBands = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('bands')
      .select('*')
      .ilike('name', `%${searchQuery}%`)
      .limit(10);

    if (error) {
      console.error('Error searching bands:', error);
    } else {
      setSearchResults(data || []);
    }
  };

  const joinBand = async (bandId: string) => {
    if (!user) return;

    setLoading(true);
    const { error } = await supabase
      .from('band_members')
      .insert([{
        band_id: bandId,
        user_id: user.id
      }]);

    if (error) {
      console.error('Error joining band:', error);
    } else {
      // Update user's profile with the band_id
      await supabase
        .from('profiles')
        .update({ band_id: bandId })
        .eq('id', user.id);
      
      onBandSelected(bandId);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timeoutId = setTimeout(searchBands, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (view === 'create') {
    return (
      <div className="App">
        <header className="header">
          <button onClick={() => setView('select')} className="back-btn">
            ← Back
          </button>
          <h1>Create Band</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        
        <div className="settings-container">
          <div className="settings-section">
            <div className="setting-item">
              <label className="setting-label">Band Name *</label>
              <input
                type="text"
                value={newBandName}
                onChange={(e) => setNewBandName(e.target.value)}
                placeholder="Enter band name"
                className="profile-input"
              />
            </div>
            
            <div className="setting-item">
              <label className="setting-label">Description</label>
              <textarea
                value={newBandDescription}
                onChange={(e) => setNewBandDescription(e.target.value)}
                placeholder="Optional description"
                className="profile-input"
                rows={3}
              />
            </div>
            
            <button 
              onClick={createBand} 
              disabled={!newBandName.trim() || loading}
              className="save-btn"
            >
              {loading ? 'Creating...' : 'Create Band'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="App">
        <header className="header">
          <button onClick={() => setView('select')} className="back-btn">
            ← Back
          </button>
          <h1>Join Band</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        
        <div className="settings-container">
          <div className="settings-section">
            <div className="setting-item">
              <label className="setting-label">Search for a band</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type band name to search..."
                className="profile-input"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((band) => (
                  <div key={band.id} className="band-result">
                    <div>
                      <h4>{band.name}</h4>
                      {band.description && <p>{band.description}</p>}
                    </div>
                    <button 
                      onClick={() => joinBand(band.id)}
                      disabled={loading}
                      className="save-btn"
                    >
                      {loading ? 'Joining...' : 'Join'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <h1>Select a Band</h1>
      </header>
      
      <div className="settings-container">
        {bands.length > 0 && (
          <div className="settings-section">
            <h2>Your Bands</h2>
            {bands.map((band) => (
              <div key={band.id} className="band-item" onClick={() => onBandSelected(band.id)}>
                <h4>{band.name}</h4>
                {band.description && <p>{band.description}</p>}
              </div>
            ))}
          </div>
        )}
        
        <div className="settings-section">
          <h2>Get Started</h2>
          <button 
            onClick={() => setView('create')} 
            className="save-btn band-action-btn"
          >
            Create New Band
          </button>
          <button 
            onClick={() => setView('join')} 
            className="edit-btn band-action-btn"
          >
            Join Existing Band
          </button>
        </div>
      </div>
    </div>
  );
};