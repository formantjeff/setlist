import React, { useEffect } from 'react';
import { exchangeCodeForToken } from './services/spotify';
import { spotifyPlayerService } from './services/spotifyPlayer';

const SpotifyCallback: React.FC = () => {
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        console.error('Spotify authentication error:', error);
        window.location.href = '/';
        return;
      }

      if (code) {
        try {
          const accessToken = await exchangeCodeForToken(code);
          
          // Initialize the Spotify player with the user token
          spotifyPlayerService.setAccessToken(accessToken);
          
          console.log('Spotify authentication successful, redirecting...');
          
          // Redirect back to the main app
          window.location.href = '/';
        } catch (error) {
          console.error('Failed to exchange code for token:', error);
          window.location.href = '/';
        }
      } else {
        console.error('No authorization code received');
        window.location.href = '/';
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Connecting to Spotify...</h2>
        <p className="text-muted-foreground">Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
};

export default SpotifyCallback;