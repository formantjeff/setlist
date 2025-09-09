# Setlist Manager - Development Notes

## Architecture
- **Frontend**: React 19 with TypeScript
- **UI Framework**: shadcn/ui with Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel with automatic git-based deployments
- **APIs**: Spotify Web API, Genius Lyrics API (serverless functions)

## Current Features

### Core Functionality
- **Multi-Setlist Management**: Create and manage multiple setlists per band
- **Song Library**: Browse and search existing songs across all setlists
- **Spotify Integration**: Search and add songs directly from Spotify with metadata
- **Auto-Generated Chords**: Music theory-based chord progression generation
- **Lyrics Support**: Fetch lyrics via serverless functions (production-ready, CORS-free)
- **Band Management**: Multi-user bands with collaborative setlist editing

### Music Intelligence
- **Chord Generation**: Auto-generated progressions based on:
  - Spotify audio features (key, mode, tempo)
  - Music theory (circle of fifths, major/minor scales)
  - Fallback heuristics when Spotify data unavailable
- **Smart Metadata**: Duration formatting, popularity scores, album info
- **Audio Features**: Tempo, key signature, and energy analysis

### User Experience
- **Dark/Light Mode**: Fully themed UI with system preference detection
- **Responsive Design**: Mobile-optimized touch interface
- **Modern UI**: Clean, professional interface with consistent styling
- **Real-time Updates**: Immediate feedback for all operations

## Recent Major Updates (Current Session)

### Lyrics & Chords Implementation
- **Serverless Architecture**: Vercel API functions for CORS-free lyrics fetching
- **Production vs Development**: Smart detection for API usage
- **Genius API Integration**: Full lyrics text with proper attribution
- **Chord Display**: Generated progressions shown in song detail view

### Technical Improvements
- **TypeScript Compliance**: Fixed all compilation errors and interface mismatches
- **Performance Optimization**: Eliminated infinite loops in useEffect hooks
- **Database Integrity**: Proper ID handling for song library operations
- **Theme Consistency**: Dark mode support across all modals and components

### Bug Fixes
- **Song Library Modal**: Fixed TypeScript interface conflicts and infinite re-renders
- **Database Constraints**: Resolved "null value in column 'id'" insertion errors
- **Dark Mode Support**: SongLibrary modal now respects theme preferences
- **API Error Handling**: Graceful fallbacks for failed Spotify audio features requests

## File Structure
```
src/
├── App.tsx                 # Main application with setlist management
├── SongLibrary.tsx         # Song library modal with search/filter
├── BandSelection.tsx       # Band creation and selection interface
├── services/
│   ├── spotify.ts          # Spotify Web API integration
│   └── musicData.ts        # Lyrics fetching and chord generation
├── components/ui/          # shadcn/ui component library
├── supabase.ts            # Database types and configuration
└── ThemeContext.tsx       # Dark/light mode management

api/
└── lyrics.js              # Vercel serverless function for lyrics
```

## Development Commands
- `npm start` - Start development server (port 3005)
- `PORT=3005 npm start` - Start on specific port
- `npm run build` - Create production build
- `git push` - Auto-deploy to Vercel

## API Configuration
- **Spotify**: Requires Client ID/Secret for search and audio features
- **Genius**: Access token configured for lyrics fetching
- **Supabase**: Full-stack backend with real-time subscriptions

## Current Status
✅ **Stable Features**: Setlist management, Spotify search, chord generation
✅ **Production Ready**: Auto-deployment pipeline, serverless functions
✅ **Mobile Optimized**: Touch-friendly interface, responsive design
🔄 **In Testing**: Lyrics functionality (production), chord display verification

## Known Limitations
- **Spotify Audio Features**: 403 errors with Client Credentials flow (expected)
- **Development Lyrics**: CORS-blocked (works in production via serverless functions)
- **Chord Accuracy**: Generated progressions are algorithmic approximations

## Deployment Notes
- **Vercel Integration**: Automatic deploys on git push
- **Environment Variables**: Configured in Vercel dashboard
- **Serverless Functions**: Handle CORS-restricted APIs
- **Production URL**: Auto-generated Vercel domain