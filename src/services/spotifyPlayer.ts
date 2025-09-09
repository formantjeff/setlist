// Spotify Web Playback SDK integration
// Handles music playback directly in the browser

// Extend Window interface for Spotify SDK
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
  }
}

interface SpotifyPlayer {
  addListener: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback?: (...args: any[]) => void) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getCurrentState: () => Promise<SpotifyPlayerState | null>;
  getVolume: () => Promise<number>;
  nextTrack: () => Promise<void>;
  pause: () => Promise<void>;
  previousTrack: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (position_ms: number) => Promise<void>;
  setName: (name: string) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  togglePlay: () => Promise<void>;
}

interface SpotifyPlayerState {
  context: {
    uri: string;
    metadata: any;
  };
  disallows: {
    pausing: boolean;
    peeking_next: boolean;
    peeking_prev: boolean;
    resuming: boolean;
    seeking: boolean;
    skipping_next: boolean;
    skipping_prev: boolean;
  };
  paused: boolean;
  position: number;
  repeat_mode: number;
  shuffle: boolean;
  track_window: {
    current_track: SpotifyTrack;
    next_tracks: SpotifyTrack[];
    previous_tracks: SpotifyTrack[];
  };
}

interface SpotifyTrack {
  uri: string;
  id: string;
  type: string;
  media_type: string;
  name: string;
  is_playable: boolean;
  album: {
    uri: string;
    name: string;
    images: Array<{ url: string }>;
  };
  artists: Array<{
    uri: string;
    name: string;
  }>;
}

class SpotifyPlayerService {
  private player: SpotifyPlayer | null = null;
  private deviceId: string | null = null;
  private accessToken: string | null = null;
  private isReady = false;
  private listeners: { [key: string]: Array<(...args: any[]) => void> } = {};

  constructor() {
    // Set up the Spotify Web Playback SDK ready callback
    window.onSpotifyWebPlaybackSDKReady = () => {
      this.initializePlayer();
    };
  }

  public setAccessToken(token: string) {
    this.accessToken = token;
    if (this.player && this.isReady) {
      // Reconnect with new token if player is already initialized
      this.disconnect();
      this.initializePlayer();
    }
  }

  private initializePlayer() {
    if (!this.accessToken || !window.Spotify) {
      console.warn('Spotify SDK or access token not available');
      return;
    }

    this.player = new window.Spotify.Player({
      name: 'Setlist Manager',
      getOAuthToken: (cb) => {
        cb(this.accessToken!);
      },
      volume: 0.5
    });

    // Error handling
    this.player.addListener('initialization_error', ({ message }) => {
      console.error('Spotify Player initialization error:', message);
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.error('Spotify Player authentication error:', message);
    });

    this.player.addListener('account_error', ({ message }) => {
      console.error('Spotify Player account error:', message);
    });

    this.player.addListener('playback_error', ({ message }) => {
      console.error('Spotify Player playback error:', message);
    });

    // Playback status updates
    this.player.addListener('player_state_changed', (state) => {
      this.emit('player_state_changed', state);
    });

    // Ready
    this.player.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player ready with Device ID:', device_id);
      this.deviceId = device_id;
      this.isReady = true;
      this.emit('ready', device_id);
    });

    // Not Ready
    this.player.addListener('not_ready', ({ device_id }) => {
      console.log('Spotify Player not ready with Device ID:', device_id);
      this.isReady = false;
      this.emit('not_ready', device_id);
    });

    // Connect to the player
    this.player.connect().then(success => {
      if (success) {
        console.log('Successfully connected to Spotify Player');
      } else {
        console.error('Failed to connect to Spotify Player');
      }
    });
  }

  public async playTrack(spotifyUri: string): Promise<void> {
    if (!this.accessToken || !this.deviceId) {
      throw new Error('Spotify player not ready');
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          uris: [spotifyUri]
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to play track: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Error playing track:', error);
      throw error;
    }
  }

  public async pause(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }
    return this.player.pause();
  }

  public async resume(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }
    return this.player.resume();
  }

  public async togglePlay(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }
    return this.player.togglePlay();
  }

  public async getCurrentState(): Promise<SpotifyPlayerState | null> {
    if (!this.player) {
      return null;
    }
    return this.player.getCurrentState();
  }

  public async setVolume(volume: number): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }
    return this.player.setVolume(volume);
  }

  public disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
    }
    this.isReady = false;
    this.deviceId = null;
  }

  public getDeviceId(): string | null {
    return this.deviceId;
  }

  public isPlayerReady(): boolean {
    return this.isReady;
  }

  // Event system
  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.listeners[event]) return;
    
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      this.listeners[event] = [];
    }
  }

  private emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(...args));
    }
  }
}

// Export singleton instance
export const spotifyPlayerService = new SpotifyPlayerService();
export type { SpotifyPlayerState, SpotifyTrack };