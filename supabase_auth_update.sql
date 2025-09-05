-- Authentication updates for Setlist Manager
-- Run this script in your Supabase SQL Editor

-- Add user_id column to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing songs to have a user_id (if you have any existing data)
-- You may need to modify this based on your needs
-- UPDATE songs SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- Drop the old policy
DROP POLICY IF EXISTS "Enable all operations for all users" ON songs;

-- Create new RLS policies for authenticated users
CREATE POLICY "Users can view their own songs" ON songs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own songs" ON songs
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own songs" ON songs
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own songs" ON songs
FOR DELETE USING (auth.uid() = user_id);

-- Make sure user_id is required for new songs
ALTER TABLE songs ALTER COLUMN user_id SET NOT NULL;