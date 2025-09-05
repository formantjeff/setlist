-- Setlist Manager Database Setup
-- Run this script in your Supabase SQL Editor

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

-- Create a policy that allows all operations for all users
-- Note: This is permissive - adjust for your security requirements
CREATE POLICY "Enable all operations for all users" ON songs
FOR ALL USING (true) WITH CHECK (true);

-- Insert some sample data (optional)
INSERT INTO songs (name, lyrics, chords) VALUES 
  ('Sample Song', 'Verse 1:\nThis is a sample song\nWith some sample lyrics\n\nChorus:\nSing along with me\nTo this simple melody', 'Verse: C - Am - F - G\nChorus: F - C - G - Am'),
  ('Another Song', null, 'Intro: Em - C - G - D\nVerse: Em - C - G - D');