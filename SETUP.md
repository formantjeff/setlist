# Setlist Manager Setup

## Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is created, go to the SQL Editor
3. Run the following SQL to create the songs table:

```sql
-- Create the songs table
CREATE TABLE songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lyrics TEXT,
  chords TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_songs_updated_at 
    BEFORE UPDATE ON songs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust as needed for your security requirements)
CREATE POLICY "Enable all operations for all users" ON songs
FOR ALL USING (true) WITH CHECK (true);
```

4. Go to Settings → API in your Supabase dashboard
5. Copy your Project URL and anon/public key
6. Update the `.env` file in your project root with your Supabase credentials:

```
REACT_APP_SUPABASE_URL=your_project_url_here
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

## Running the App

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The app will open in your browser at `http://localhost:3000`.

## Features

- **Mobile-first design** - Optimized for phone and tablet use
- **Add songs** - Enter song names to build your setlist
- **Manage lyrics** - Add and edit lyrics for each song
- **Manage chords** - Add and edit chord progressions for each song  
- **Real-time sync** - Data is stored in Supabase and synced across devices
- **Touch-friendly** - Large buttons and intuitive gestures

## Usage

1. **Adding songs**: Use the input field at the top to add new songs to your setlist
2. **Viewing/editing songs**: Tap on any song to view its details
3. **Adding lyrics/chords**: In the song detail view, tap "Add" or "Edit" buttons to manage content
4. **Deleting songs**: In the song detail view, tap the "Delete" button in the header

The app automatically saves all changes to your Supabase database.