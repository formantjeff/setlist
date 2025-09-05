# Setlist Manager - Development Notes

## Architecture
- **Frontend**: React 19 with TypeScript
- **UI Framework**: shadcn/ui with Tailwind CSS
- **Drag & Drop**: @dnd-kit for professional song reordering
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Icons**: Lucide React for consistent iconography

## Recent Updates

### Mode System Removal & Conditional Drag-and-Drop
- **Removed global mode system**: Eliminated ModeProvider and useMode hook
- **Contextual editing**: All editing functionality (lyrics, notes, song details) is always available
- **Conditional reordering**: Drag handles only appear when clicking the edit/pencil icon in the header
- **Professional drag experience**: 
  - Enhanced drag overlay with card preview
  - Smooth visual feedback during dragging
  - Cards automatically move out of the way
  - Touch and pointer sensor optimization

### UI Improvements
- **Header controls**: Edit/pencil icon toggles song reordering mode
- **Better drag handles**: Larger, more touch-friendly drag indicators
- **Visual feedback**: Active drag state with opacity and shadow effects
- **Responsive design**: Works on both desktop and mobile devices

## Key Features
- **Song Management**: Add, edit, delete songs with metadata (artist, tempo, duration, notes)
- **Lyrics with Chords**: Inline chord notation with [G], [Em] syntax
- **Image Upload**: Song thumbnails via Supabase Storage
- **Band Management**: Multi-user bands with member roles
- **Dark/Light Theme**: User preference with system integration
- **Drag & Drop Reordering**: Professional setlist organization

## Development Commands
- `npm start` - Start development server
- `npm run build` - Create production build
- `npm test` - Run test suite

## File Structure
- `src/App.tsx` - Main application component
- `src/ThemeContext.tsx` - Dark/light mode management
- `src/AuthContext.tsx` - User authentication
- `src/supabase.tsx` - Database configuration and types
- `src/components/ui/` - shadcn/ui components
- `src/BandSelection.tsx` - Band creation/joining interface

## Recent Bug Fixes
- Fixed PostCSS configuration for Tailwind CSS compilation
- Removed obsolete ModeToggle component
- Resolved TypeScript import conflicts
- Enhanced drag sensor responsiveness

## Testing Notes
- App runs on localhost:3001 for development
- Mobile testing requires network access to development server
- All drag and drop functionality works on touch devices